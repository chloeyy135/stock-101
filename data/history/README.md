# 歷史日線（回測用）

| 檔案 | 內容 | 誰改 |
|---|---|---|
| `<代號>.csv` | 全部日線：`date,open,high,low,close,volume`，價格是**還原後**的（配息、分割都調整進去） | `tools/fetch_history.py`（整檔覆寫） |
| `meta.json` | 每檔的來源、抓取時間、第一天、最後一天、筆數；抓失敗會有 `error` | 同上 |

代號用 Yahoo Finance 的寫法：台股加 `.TW`（`0050.TW`、`2330.TW`），美股直接寫（`SPY`）。要加標的改 `config/backtest.json`。

`adjusted: false` 的檔案是 `tools/import_us_bars.py` 從 `data/us`（美股日報）借來的未還原日 K，只是讓頁面在第一次抓資料前有東西看；`fetch_history.py` 跑過就會換成還原後的完整歷史。

Claude 的沙盒連不到 Yahoo Finance，所以抓資料在 GitHub Actions（`.github/workflows/backtest.yml`，每週六早上）或自己電腦上跑：

```
pip install -r tools/requirements.txt
python3 tools/fetch_history.py        # 抓全部；後面接代號可以只抓幾檔
python3 tools/run_backtest.py         # 重算 data/backtest/results.js 和 REPORT.md
python3 -m unittest discover -s tests # 回測引擎的測試
```
