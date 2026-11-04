"""台股入門 60 天 — 回測引擎（純 pandas）。

每個策略都是「日 K 表 → 每天的持倉比例（0 或 1）」的函式；engine 把持倉變成權益曲線（含成本），
metrics 算 CAGR、最大回檔等數字，report 組成網頁用的結構。詳見 docs/superpowers/specs。
"""
