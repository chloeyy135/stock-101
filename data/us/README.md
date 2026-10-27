# 美股日報的資料

`trend.html` 照 `index.js` 列的檔案載入。全部是 `<script>` 檔，用 `file://` 直接打開也能用。

| 檔案 | 內容 | 誰改 |
|---|---|---|
| `seed-代號.js` | 2026-10-23 以前約 300 個交易日的日 K（`window.US_BARS`） | 不再改 |
| `bars-YYYY-MM.js` | 之後每天新增的日 K，六檔放在同一個月檔 | `tools/us-daily.js add-bars` |
| `report-YYYY-MM-DD.js` | 日報，檔名是**台灣日期**（寫的那天早上） | 手寫 |
| `calls-YYYY-MM.js` | 從日報抽出來的練習預測，網頁用它幫 Claude 記分 | `tools/us-daily.js add-report` |
| `index.js` | 資料目錄：要載入的檔案、有哪幾份日報 | `tools/us-daily.js` |

日 K 一根一行：`["日期", 開, 高, 低, 收, 量]`，日期是美東時間的交易日。資料來源是 Stocklake 的 `get_stock_history`。

已知的資料缺口：NVDA 在 2025-08、2025-09、2025-12 有 8 個交易日沒有資料，COST 在 2025-09 缺 2 天。都在日 K 圖顯示的範圍之外，只影響那幾週的週 K。

## 每天更新的步驟

台灣時間週二到週六早上，美股前一天收盤之後做。

1. 同步：`git fetch origin claude/festive-wright-5t36uk`，再 `git checkout -B claude/festive-wright-5t36uk origin/claude/festive-wright-5t36uk`（工作區要是乾淨的）。
2. 抓資料：對 SPY、TSLA、GOOG、NVDA、AAPL、COST 各呼叫一次 Stocklake `get_stock_history`（`days: 5`）。把六個 `history` 陣列照抄成一個 JSON：`{ "SPY": [...], "TSLA": [...], ... }`，存到暫存資料夾。
3. `node tools/us-daily.js add-bars 那個檔案.json`：加上新的 K 線，也會用新抓到的數字蓋過最近幾天的舊數字（資料商常在隔天修正最後一天的收盤和成交量；有修正就在日報的 check 寫更正）。如果「新增 0 根」，代表美股休市，今天不寫日報，到此結束。
4. `node tools/us-daily.js snapshot`：印出每檔的體檢表、支撐壓力、最近 5 天收盤，和每一筆練習預測的結果。
5. 查這週的大事：Stocklake `get_earnings_calendar`、`get_economic_calendar`、`get_stock_news`、`get_market_pulse`（恐懼貪婪指數、VIX）。
6. 寫 `report-台灣日期.js`，格式照最近一份日報。每個數字都要來自 snapshot 或有來源的資料，查不到就不寫。
7. `node tools/us-daily.js add-report 台灣日期`：檢查格式、登記到目錄、抽出練習預測。再跑一次 `node tools/us-daily.js check`。
8. 用瀏覽器打開 `trend.html` 看一次，沒有錯誤再推上去：用 GitHub 連接器的 `push_files` 一次推 `index.js`、`bars-YYYY-MM.js`、`calls-YYYY-MM.js`、`report-台灣日期.js` 四個檔。
9. 推完 `git fetch` 再比對 `git diff --stat HEAD origin/claude/festive-wright-5t36uk`，要是空的。

## 日報的欄位

```js
(window.US_REPORTS = window.US_REPORTS || []).push({
  date: '2026-10-26',          // 台灣日期（寫的那天）
  bars: '2026-10-23',          // 用的是美股哪一天的收盤
  title: '一句話標題',
  market: ['大盤和氣氛，2～4 點'],
  events: [{ when: '10/29（四）凌晨 2 點', what: '台灣時間的大事' }],
  tip: { no: 1, title: '今天學一招', body: ['段落', '段落'] },
  check: ['上一期的情境，結果如何（第一期是空的）'],
  stocks: {
    SPY: {
      head: '一句話',
      points: ['圖上看到什麼，3～5 點'],
      plan: [{ if: '條件', then: '代表什麼' }],
      call: { dir: 'up | down | flat', conf: 34～95, why: '先講基準率，再講為什麼調整' },
      watch: '接下來要注意的價位或事件'
    }
    // TSLA、GOOG、NVDA、AAPL、COST 都要有
  },
  sources: [{ text: '來源說明（日期）', url: '可以省略' }]
});
```

練習預測一律是「5 個交易日後」：漲跌超過 ±2% 算漲或跌，其他算盤整。從 `bars` 那天的收盤算起。

## 「今天學一招」的順序

一天一招，教完再從頭換新的例子：

1. 先看基準率
2. 用 MA60 分上升、下降、盤整
3. 高點和低點有沒有墊高
4. 支撐和壓力；跌破的支撐會變壓力
5. 突破要看成交量
6. 跳空和財報行情
7. 均線排列和糾結
8. MACD 柱子：加速和減速
9. RSI、KD 的鈍化：熱不等於要跌
10. 布林通道收斂之後
11. 多週期：週 K 定方向，日 K 找價位
12. 相對強弱：跟 SPY 比
13. 財報週為什麼線圖會失效
14. Fed、利率和大盤
15. 情境的寫法：如果……就……
16. 失效點：什麼時候承認看錯
17. 把握 60% 的意思：校準
18. 波動度和部位大小
19. 新聞標題和股價
20. 回顧：命中率和基準率比一比
