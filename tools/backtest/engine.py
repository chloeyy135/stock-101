"""把持倉序列變成權益曲線（起始資金 1 元），以及定期定額的模擬。"""
import pandas as pd


def run_timing(df, position, cost):
    """position：每天 0 或 1。持倉從 0 變 1 的那天開盤買進，從 1 變 0 的那天開盤賣出。
    回傳 {'equity': 每日權益（起始 1）, 'trades': [{entry, entry_price, exit, exit_price, ret}], 'exposure': 在場比例}。"""
    opens = df['open'].values
    closes = df['close'].values
    pos = position.reindex(df.index).fillna(0).astype(int).values
    cash, units = 1.0, 0.0
    equity = []
    trades = []
    cur = None
    prev = 0
    for i in range(len(df)):
        if pos[i] != prev:
            if pos[i] == 1:
                fee = cost.buy_cost(cash)
                units = (cash - fee) / opens[i]
                cur = {'entry': df.index[i].strftime('%Y-%m-%d'), 'entry_price': float(opens[i]), 'entry_value': cash}
                cash = 0.0
            else:
                proceeds = units * opens[i]
                cash = proceeds - cost.sell_cost(proceeds)
                units = 0.0
                cur.update({'exit': df.index[i].strftime('%Y-%m-%d'), 'exit_price': float(opens[i]), 'ret': cash / cur['entry_value'] - 1})
                trades.append(cur)
                cur = None
            prev = pos[i]
        equity.append(cash + units * closes[i])
    if cur is not None:
        # 還抱著：用最後一天收盤計價（不扣賣出成本），exit 為 None
        cur.update({'exit': None, 'exit_price': None, 'ret': equity[-1] / cur['entry_value'] - 1})
        trades.append(cur)
    eq = pd.Series(equity, index=df.index, name='equity')
    return {'equity': eq, 'trades': trades, 'exposure': float(pos.mean()) if len(pos) else 0.0}


def run_dca(df, cost, amount, dates=None):
    """每個買進日開盤投入 amount（先扣手續費）。回傳每日市值、累計投入、XIRR 用的現金流。"""
    from .strategies import dca_dates
    buy_days = set(dates if dates is not None else dca_dates(df))
    units = 0.0
    invested = 0.0
    value, invested_series, flows = [], [], []
    for ts, row in zip(df.index, df[['open', 'close']].itertuples(index=False)):
        if ts in buy_days:
            units += (amount - cost.buy_cost(amount)) / row.open
            invested += amount
            flows.append((ts, -float(amount)))
        value.append(units * row.close)
        invested_series.append(invested)
    v = pd.Series(value, index=df.index, name='value')
    flows.append((df.index[-1], float(v.iloc[-1])))
    return {'value': v, 'invested_series': pd.Series(invested_series, index=df.index), 'invested': invested,
            'buys': len(buy_days & set(df.index)), 'cashflows': flows, 'units': units}
