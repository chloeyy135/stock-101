#!/usr/bin/env python3
"""用 FinMind 抓台股日線，交給 Claude 做技術面分析。

用法（repo 根目錄）：
    export ANTHROPIC_API_KEY=sk-ant-...        # 必要
    export FINMIND_TOKEN=...                   # 可選；沒有 token 時 FinMind 有每小時次數限制
    python3 tools/finmind_claude_analysis.py 2330 2025-01-01 2025-12-31
    python3 tools/finmind_claude_analysis.py 0050 2024-01-01 2025-12-31 --out report.md

安裝套件：pip install anthropic FinMind
（Debian／Ubuntu 的系統 Python 3.13 上，FinMind 依賴的 ta 套件可能編不過；
  改用 venv 就好：python3 -m venv .venv && .venv/bin/pip install anthropic FinMind）

資料來源是 FinMind 的 TaiwanStockDaily（未還原、不含息的日線），分析結果只供教育用途，不構成買賣建議。
"""
import argparse
import json
import os
import sys

import anthropic
from FinMind.data import DataLoader

MODEL = "claude-opus-5-5"

SYSTEM_PROMPT = """你是一位專業的台股量化與技術面分析師，面對的是剛開始學投資的台灣讀者。
規則：
- 只根據提供的數據做分析，數據裡沒有的事（財報、新聞、法人籌碼）不要編造；需要時明說「資料未提供」。
- 每個數字都要可以從數據算出來；引用價位、日期時要精確。
- 用繁體中文、白話，專有名詞第一次出現時用一句話解釋。
- 結尾固定加一句：「本分析為教育用途，不構成買賣建議。」"""

ANALYSIS_TEMPLATE = """以下是從 FinMind API 取得的台股（代號：{stock_id}）歷史交易數據（JSON 格式，TaiwanStockDaily，未還原、不含配息）：

```json
{json_payload}
```

請依序完成：
1. **價格摘要**：期間起訖收盤價、漲跌幅、最高／最低價與發生日期、平均成交量。
2. **趨勢判讀**：用 20 日與 60 日均線（請自行由收盤價計算）說明目前是多頭、空頭還是盤整，並指出最近一次均線交叉的日期與方向。
3. **波動與風險**：日報酬的標準差（年化：乘以 √252）、期間最大回檔（從高點到低點的跌幅與日期）。
4. **量價關係**：找出成交量最大的 3 天，說明當天的漲跌與之後 5 個交易日的走勢。
5. **支撐與壓力**：根據近期的高低點，給出 1～2 個支撐與壓力價位，並說明依據。
6. **三行重點**：給初學者的三句話結論。

輸出用 Markdown，表格呈現數字。"""


def fetch_daily(stock_id: str, start_date: str, end_date: str):
    dl = DataLoader()
    token = os.environ.get("FINMIND_TOKEN")
    if token:
        dl.login_by_token(api_token=token)
    return dl.taiwan_stock_daily(stock_id=stock_id, start_date=start_date, end_date=end_date)


def build_payload(stock_id: str, start_date: str, end_date: str, df) -> dict:
    records = []
    for _, row in df.iterrows():
        records.append({
            "date": str(row["date"]),
            "open": float(row["open"]),
            "max": float(row["max"]),
            "min": float(row["min"]),
            "close": float(row["close"]),
            "trading_volume": int(row["Trading_Volume"]),
            "trading_money": int(row["Trading_money"]),
            "spread": float(row["spread"]),
        })
    return {
        "stock_id": stock_id,
        "data_type": "TaiwanStockDaily",
        "adjusted": False,
        "total_records": len(records),
        "time_range": {"start": start_date, "end": end_date},
        "daily_prices": records,
    }


def build_prompt(stock_id: str, payload: dict) -> str:
    # 精簡 JSON（不縮排）省 token；一年日線大約 25k tokens
    json_payload = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return ANALYSIS_TEMPLATE.format(stock_id=stock_id, json_payload=json_payload)


def analyze_with_claude(client: anthropic.Anthropic, stock_id: str, payload: dict) -> str:
    prompt = build_prompt(stock_id, payload)
    estimate = client.messages.count_tokens(model=MODEL, system=SYSTEM_PROMPT, messages=[{"role": "user", "content": prompt}])
    print(f"輸入約 {estimate.input_tokens:,} tokens（{payload['total_records']} 筆日線）", file=sys.stderr)

    # 輸入可能很長，所以用串流；fallbacks="default" 讓安全分類器拒答時自動換模型重跑
    with client.beta.messages.stream(
        model=MODEL,
        max_tokens=32000,
        system=SYSTEM_PROMPT,
        output_config={"effort": "high"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
        response = stream.get_final_message()
    print()

    if response.stop_reason == "refusal":
        detail = response.stop_details.explanation if response.stop_details else ""
        raise RuntimeError(f"Claude 拒絕回答：{detail}")
    if response.stop_reason == "max_tokens":
        print("警告：回答被 max_tokens 截斷，請調高上限。", file=sys.stderr)
    usage = response.usage
    print(f"[用量] input {usage.input_tokens:,} / output {usage.output_tokens:,} tokens，模型 {response.model}", file=sys.stderr)
    return "".join(block.text for block in response.content if block.type == "text")


def fetch_and_analyze_stock(stock_id: str, start_date: str, end_date: str, out_path: str | None = None) -> str | None:
    print(f"正在從 FinMind 抓取 {stock_id} 的歷史資料 ({start_date} ~ {end_date})...", file=sys.stderr)
    df = fetch_daily(stock_id, start_date, end_date)
    if df.empty:
        print("查無資料，請檢查股票代號或日期設定。", file=sys.stderr)
        return None

    payload = build_payload(stock_id, start_date, end_date, df)
    print(f"抓到 {payload['total_records']} 筆（{df['date'].iloc[0]} ～ {df['date'].iloc[-1]}），傳送給 Claude 分析...\n", file=sys.stderr)

    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        print("沒有 ANTHROPIC_API_KEY（或 ANTHROPIC_AUTH_TOKEN），無法呼叫 Claude。", file=sys.stderr)
        return None

    client = anthropic.Anthropic()
    try:
        report = analyze_with_claude(client, stock_id, payload)
    except anthropic.AuthenticationError:
        print("API key 無效。", file=sys.stderr); return None
    except anthropic.RateLimitError as e:
        print(f"被限流，{e.response.headers.get('retry-after', '60')} 秒後再試。", file=sys.stderr); return None
    except anthropic.APIStatusError as e:
        print(f"API 錯誤 {e.status_code}：{e.message}", file=sys.stderr); return None
    except anthropic.APIConnectionError:
        print("連不上 Anthropic API，請檢查網路。", file=sys.stderr); return None

    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(f"# {stock_id} 技術面分析（{start_date} ～ {end_date}）\n\n資料：FinMind TaiwanStockDaily，未還原、不含配息。模型：{MODEL}。\n\n")
            f.write(report)
        print(f"已寫入 {out_path}", file=sys.stderr)
    return report


def main():
    ap = argparse.ArgumentParser(description="FinMind 日線 → Claude 技術面分析")
    ap.add_argument("stock_id", help="台股代號，例如 2330、0050")
    ap.add_argument("start_date", help="YYYY-MM-DD")
    ap.add_argument("end_date", help="YYYY-MM-DD")
    ap.add_argument("--out", help="把分析結果另存成 Markdown 檔")
    args = ap.parse_args()
    result = fetch_and_analyze_stock(args.stock_id, args.start_date, args.end_date, args.out)
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
