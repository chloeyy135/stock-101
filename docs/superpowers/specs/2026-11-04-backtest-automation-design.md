# 回測自動化：股票／ETF 歷史資料分析（設計）

日期：2026-11-04　狀態：第一版，依下列假設直接實作；請看完後修正方向。

## 目的

給「台股入門 60 天」加一個**自動更新的回測頁**，用真的歷史資料回答課程裡反覆出現的問題：
長期持有 0050／SPY 會怎樣？定期定額呢？用均線進出有沒有比較好？最慘的一段會賠多少？
每個數字都要有資料日期和來源，和網站其他頁一樣。

成功的樣子：

1. 每週自動抓最新日線、重跑回測、把結果推回 repo，網頁跟著更新，不用人手動。
2. `backtest.html` 看得懂：每檔每策略的年化報酬、最大回檔、夏普值、滾動報酬、年報酬表、權益曲線。
3. 回測引擎有測試，數字可以被驗證（CAGR、MDD、XIRR 都用已知答案的合成資料驗過）。

## 已確認的限制

- 這個 Claude 沙盒**連不到 Yahoo Finance**（proxy 擋），Stocklake 只有美股、免費版最多 365 天、沒有台股。
  所以抓資料放在 **GitHub Actions** 做（GitHub 的機器可以連 Yahoo）；本機也能跑同一支腳本。
- 網站不能有建置步驟、要能用 `file://` 開，所以結果照既有慣例寫成 `window.*` 的 JS 檔。

## 假設（請修正）

| 項目 | 假設 |
|---|---|
| 標的 | 台股 ETF：0050、0056、006208、00878；台股：2330；美股 ETF：SPY、QQQ、VT；美股：既有六檔中的 TSLA、NVDA、AAPL、GOOG、COST（SPY 已在 ETF） |
| 資料 | Yahoo Finance 日線（yfinance，`auto_adjust=True`），價格**含息還原**，所以報酬是含息總報酬 |
| 策略 | 單筆買進持有、每月定期定額、均線交叉（MA20／MA60）、年線濾網（收盤在 MA200 之上才持有） |
| 交易成本 | 台股：手續費 0.1425%×6 折（買賣各一次），交易稅 ETF 0.1%、股票 0.3%（賣出）；美股：0 手續費、賣出收 SEC fee 忽略。定期定額手續費最低 1 元（台幣）不計 |
| 成交 | 訊號在 t 日收盤算出，**t+1 日開盤**成交，避免偷看 |
| 無風險利率 | 0（夏普值＝年化報酬÷年化波動） |
| 更新頻率 | 每週六台灣時間早上（台美股都收完），加手動觸發 |
| 起始日 | 每檔有多少用多少；比較不同策略時用同一檔自己的全部區間 |

## 架構

```
config/backtest.json          標的、策略參數、成本（要加標的就改這裡）
tools/fetch_history.py        用 yfinance 抓全部日線 → data/history/<代號>.csv（整檔覆寫）
tools/import_us_bars.py       把 data/us 既有的美股日 K 轉成同格式 CSV（第一次 Action 跑完就會被覆寫）
tools/backtest/               回測引擎（純 pandas）
  data.py                     讀 CSV、檢查格式
  costs.py                    成本模型
  strategies.py               四種策略 → 每天的持倉比例（0 或 1）/ 定期定額的現金流
  engine.py                   把持倉比例變成權益曲線（含成本）
  metrics.py                  CAGR、MDD、波動、夏普、Calmar、年報酬、滾動報酬、XIRR
  report.py                   組成 results 結構
tools/run_backtest.py         讀 config → 跑全部 → 寫 data/backtest/results.js 和 REPORT.md
tests/test_backtest.py        unittest，合成資料
backtest.html + js/backtest.js  網頁
.github/workflows/backtest.yml  每週跑：fetch → run → commit
```

### 資料格式

`data/history/<代號>.csv`：`date,open,high,low,close,volume`，皆為**還原後**價格（yfinance auto_adjust）。
`data/history/meta.json`：每檔的來源、抓取時間、第一天、最後一天、筆數。
匯入自 `data/us` 的檔案是**未還原**價格，meta 會標 `adjusted: false`，網頁顯示「不含息」提醒。

### 結果格式（`data/backtest/results.js`）

```js
window.BACKTEST = {
  generated: '2026-11-04', source: '...',
  symbols: [{ id: '0050.TW', name: '元大台灣 50', market: 'tw', kind: 'etf', first: '2003-06-30', last: '...', bars: 5400, adjusted: true }],
  strategies: [{ id: 'buy_hold', name: '買進持有', desc: '...' }, ...],
  results: { '0050.TW': { buy_hold: { metrics: {...}, yearly: {...}, rolling: { '1y': {...}, '3y': {...}, '5y': {...} }, equity: [[date, value], ...] /* 每週一點 */, trades: n },
                          dca: { metrics: { invested, final, xirr, ... }, equity: [...] } } }
};
```

權益曲線為了檔案大小只存每週最後一天（約 52 點／年）。

## 錯誤處理

- 抓不到某檔：跳過、寫進 meta 的 `error`，不讓整個流程失敗；網頁顯示「這檔沒資料」。
- CSV 不合法（高低價顛倒、日期沒排序、重複）：`data.py` 丟錯，流程停止，不會寫出壞結果。
- 筆數太少（< 260 根）：不跑均線策略，只跑買進持有和定期定額，並標註。
- Action 沒有變更就不 commit。

## 測試

- 合成等比上漲序列：CAGR 等於設定值、MDD＝0。
- 先漲後跌再漲：MDD 等於已知值、日期正確。
- 定期定額：固定價格下 XIRR＝0；價格每期翻倍的簡單案例可手算。
- 均線交叉：持倉在交叉**隔天**才改變（沒有偷看）。
- 成本：一買一賣的成本等於公式。
- `run_backtest.py` 用 fixture 跑完能產出合法 JSON。

## 不做的事（YAGNI）

多資產配置與再平衡、參數掃描／最佳化、盤中資料、融資放空、股利另外處理（含息價已涵蓋）、資料庫。
之後要加，策略都是「價格序列 → 每天持倉比例」的函式，加一個就好。
