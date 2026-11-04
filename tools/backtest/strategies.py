"""策略：日 K 表 → 每天的持倉比例（0 或 1）。

持倉的意思是「這一天從開盤到隔天開盤之間抱著」。訊號用 t 日收盤算，所以要 shift(1)，
t+1 日開盤才進出，不會偷看到當天收盤。定期定額另外給買進的日期。
"""
import pandas as pd


def buy_hold(df):
    return pd.Series(1, index=df.index, dtype=int)


def sma_cross(df, fast=20, slow=60):
    c = df['close']
    signal = (c.rolling(fast).mean() > c.rolling(slow).mean()).astype(int)
    return signal.shift(1).fillna(0).astype(int)


def sma_filter(df, n=200):
    c = df['close']
    signal = (c > c.rolling(n).mean()).astype(int)
    return signal.shift(1).fillna(0).astype(int)


def dca_dates(df):
    """每個月第一個交易日。"""
    months = df.index.to_period('M')
    first = ~pd.Series(months, index=df.index).duplicated()
    return list(df.index[first.values])


# 給 run_backtest 用：名字 → 函式（定期定額走另一條路）
TIMING = {'buy_hold': buy_hold, 'sma_cross': sma_cross, 'sma_filter': sma_filter}

INFO = {
    'buy_hold': {'name': '買進持有', 'desc': '第一天開盤全部買進，一直抱到最後。這是其他策略要打敗的基準。'},
    'dca': {'name': '定期定額', 'desc': '每個月第一個交易日固定投入一筆錢（台股 NT$10,000、美股 US$300），不賣。用 XIRR（內部報酬率）看年化報酬。'},
    'sma_cross': {'name': '均線交叉', 'desc': 'MA{fast} 在 MA{slow} 之上就持有，之下就空手。訊號用收盤算、隔天開盤成交，含手續費和稅。'},
    'sma_filter': {'name': '年線濾網', 'desc': '收盤在 MA{n} 之上就持有，之下就空手。隔天開盤成交，含手續費和稅。'},
}
