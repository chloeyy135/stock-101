#!/usr/bin/env python3
"""用 FinMind 抓台股財報三表（綜合損益、資產負債、現金流量），交給 Claude 做財報分析。

用法（repo 根目錄）：
    export ANTHROPIC_API_KEY=sk-ant-...
    export FINMIND_TOKEN=...            # 可選
    python3 tools/finmind_financials_analysis.py 2330 台積電 2024-01-01 2026-09-30 --purpose 單一公司深度分析 --out 2330.md

重點（對應分析規則）：
- 現金流量表在台灣是年度內累計數，這裡先還原成單季再交給 Claude，並在資料裡標 restored_to_single_quarter。
- 綜合損益表的口徑用 --income-basis 指定（single 或 cumulative），預設 single；cumulative 會一樣還原。
  我沒有驗證 FinMind 損益表一定是單季，請拿一季和公司財報核對一次。
- FinMind 的財報資料只有會計期間結束日，沒有公告日（report_date）。腳本會把這件事寫進 prompt，
  讓分析標明「時間對齊口徑為期間結束日、不是公告日」，不會偷偷假設公告日。
- 數字缺的地方不補，留空，由 prompt 要求標「資料不足，未計算」。

安裝：pip install anthropic FinMind（Debian 系統 Python 編不過 ta 時請用 venv）
"""
import argparse
import json
import os
import sys

MODEL = "claude-opus-5-5"

SYSTEM_PROMPT = """你是一位嚴謹的台股財務分析師。
資料規則（務必遵守）：
1. 台股財報有「單季」與「累計」兩種口徑。計算任何季增率、年增率、利潤率前，必須統一為單季口徑；資料若是累計數，先還原為單季再計算，並在輸出中註明你做了還原。資料裡的 basis 欄位已標明每張表的口徑與是否已還原。
2. 時間對齊以財報公告日（report_date）為準。這份資料只有會計期間結束日，沒有公告日，請在輸出開頭註明「時間以期間結束日對齊，未使用公告日，不適用於回測用途」，不要自行推估公告日。
3. 民國年轉西元年（民國 YY 年 = 西元 YY+1911 年）。
4. 數據缺失或口徑不明，明確標示「資料不足，未計算」，禁止用估算值或常識推測填補。
5. 金額單位統一標明並註明幣別；資料單位為 FinMind 原始值（新台幣），若無法確認單位請如實註明。
表格優先，文字精簡，每個數字後標註資料來源期間（例如 2025Q2 單季）。最後一行固定寫：「本分析基於所提供數據，未構成投資建議。」"""

FRAMEWORK = """請依序輸出五個部分：
一、公司與期間概覽：一句話業務與獲利模式；營收規模與趨勢方向。
二、獲利能力（逐季表格）：毛利率、營業利益率、稅後淨利率（單季）；ROE、ROA（資料足夠才算）；標出趨勢轉折點並指出驅動的成本或費用項目。
三、財務結構與現金流：負債比、流動比、速動比；營業現金流 vs 稅後淨利；自由現金流趨勢；存貨與應收帳款週轉天數變化。
四、成長與品質：營收 YoY、EPS YoY（單季）；營收成長與現金流成長是否同步；若為選股用途列出 3 個關鍵正向訊號與 3 個關鍵風險訊號。
五、結論與待驗證事項：一段式結論（不超過 150 字）；列出「本分析因資料限制而未能確認的事項」。"""


def fetch_statements(stock_id, start_date, end_date):
    from FinMind.data import DataLoader
    dl = DataLoader()
    token = os.environ.get("FINMIND_TOKEN")
    if token:
        dl.login_by_token(api_token=token)
    kw = dict(stock_id=stock_id, start_date=start_date, end_date=end_date)
    return {
        "income": dl.taiwan_stock_financial_statement(**kw),
        "balance": dl.taiwan_stock_balance_sheet(**kw),
        "cashflow": dl.taiwan_stock_cash_flows_statement(**kw),
    }


def to_table(df):
    """long format（date, type, value, origin_name）轉成 {date: {type: value}}，另回傳 type → 中文名稱。"""
    table, names = {}, {}
    for _, r in df.iterrows():
        d = str(r["date"])[:10]
        table.setdefault(d, {})[r["type"]] = None if r["value"] != r["value"] else float(r["value"])
        names[r["type"]] = r.get("origin_name", r["type"])
    return dict(sorted(table.items())), names


def cumulative_to_single(table):
    """年度內累計 → 單季：同一年內後一季減前一季；每年第一個出現的季度（通常 Q1）原樣保留。
    任一項前後缺值就留 None，不補。"""
    out, prev = {}, {}
    for d in sorted(table):
        year = d[:4]
        out[d] = {}
        for k, v in table[d].items():
            before = prev.get((year, k))
            if v is None:
                out[d][k] = None
            elif before is None and (year, k) in prev:
                out[d][k] = None
            else:
                out[d][k] = v if before is None else v - before
            prev[(year, k)] = v
    return out


def build_payload(stock_id, name, dfs, income_basis):
    income, n1 = to_table(dfs["income"])
    balance, n2 = to_table(dfs["balance"])
    cash, n3 = to_table(dfs["cashflow"])
    restored_income = income_basis == "cumulative"
    return {
        "stock_id": stock_id, "name": name, "source": "FinMind taiwan_stock_financial_statement / balance_sheet / cash_flows_statement",
        "date_semantics": "period_end_date（資料集不含公告日 report_date）",
        "currency_unit": "新台幣；FinMind 原始值，單位未驗證",
        "income": {"basis": "single_quarter" + ("（已由累計還原）" if restored_income else "（依 --income-basis，未驗證）"),
                   "data": cumulative_to_single(income) if restored_income else income},
        "balance": {"basis": "point_in_time（期末餘額）", "data": balance},
        "cashflow": {"basis": "single_quarter（已由年度累計還原）", "restored_to_single_quarter": True, "data": cumulative_to_single(cash)},
        "item_names": {**n1, **n2, **n3},
    }


def build_prompt(company, period, purpose, payload):
    return (f"【分析對象】公司：{company}；分析期間：{period}；分析目的：{purpose}\n\n"
            f"以下是財報資料（JSON）：\n```json\n{json.dumps(payload, ensure_ascii=False)}\n```\n\n{FRAMEWORK}")


def analyze(prompt):
    import anthropic
    client = anthropic.Anthropic()
    with client.beta.messages.stream(
        model=MODEL, max_tokens=32000, system=SYSTEM_PROMPT, output_config={"effort": "high"},
        betas=["server-side-fallback-2026-07-01"], fallbacks="default",
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for t in stream.text_stream:
            print(t, end="", flush=True)
        resp = stream.get_final_message()
    print()
    if resp.stop_reason == "refusal":
        raise RuntimeError("Claude 拒絕回答")
    if resp.stop_reason == "max_tokens":
        print("警告：回答被截斷，請調高 max_tokens。", file=sys.stderr)
    return "".join(b.text for b in resp.content if b.type == "text")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("stock_id")
    ap.add_argument("name", help="公司名稱，例如 台積電")
    ap.add_argument("start_date")
    ap.add_argument("end_date")
    ap.add_argument("--purpose", default="單一公司深度分析", help="選股評估／單一公司深度分析／同業比較")
    ap.add_argument("--income-basis", choices=["single", "cumulative"], default="single")
    ap.add_argument("--out")
    ap.add_argument("--dry-run", action="store_true", help="只抓資料並印出 prompt 大小，不呼叫 Claude")
    a = ap.parse_args()
    dfs = fetch_statements(a.stock_id, a.start_date, a.end_date)
    if any(len(df) == 0 for df in dfs.values()):
        sys.exit("FinMind 回傳空資料：請確認代號、期間與 token。" + str({k: len(v) for k, v in dfs.items()}))
    prompt = build_prompt(f"{a.name} {a.stock_id}", f"{a.start_date}～{a.end_date}", a.purpose,
                          build_payload(a.stock_id, a.name, dfs, "cumulative" if a.income_basis == "cumulative" else "single"))
    if a.dry_run:
        print(f"prompt {len(prompt):,} 字元，未呼叫 Claude")
        return
    text = analyze(prompt)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(text + "\n")
        print(f"已寫入 {a.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
