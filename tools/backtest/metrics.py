"""績效數字。權益曲線是以日期為索引的 Series。"""
import math

import numpy as np
import pandas as pd

DAYS_PER_YEAR = 365.25
TRADING_DAYS = 252


def _years(idx):
    return (idx[-1] - idx[0]).days / DAYS_PER_YEAR


def total_return(eq):
    return float(eq.iloc[-1] / eq.iloc[0] - 1)


def cagr(eq):
    y = _years(eq.index)
    if y <= 0 or eq.iloc[0] <= 0:
        return float('nan')
    return float((eq.iloc[-1] / eq.iloc[0]) ** (1 / y) - 1)


def max_drawdown(eq):
    """最大回檔：從哪個高點跌到哪個低點、跌幾 %、幾天後回到高點（還沒回來就 None）。"""
    peak = eq.cummax()
    dd = eq / peak - 1
    if (dd >= 0).all():
        return {'mdd': 0.0, 'peak': None, 'trough': None, 'recovery': None, 'days': 0}
    trough_i = int(dd.values.argmin())
    trough = eq.index[trough_i]
    peak_val = peak.iloc[trough_i]
    peak_i = int(np.where(eq.values[:trough_i + 1] >= peak_val)[0][0])
    after = eq.iloc[trough_i:]
    rec = after[after >= peak_val]
    recovery = rec.index[0] if len(rec) else None
    end = recovery if recovery is not None else eq.index[-1]
    return {'mdd': float(dd.iloc[trough_i]), 'peak': eq.index[peak_i].strftime('%Y-%m-%d'),
            'trough': trough.strftime('%Y-%m-%d'), 'recovery': recovery.strftime('%Y-%m-%d') if recovery is not None else None,
            'days': int((end - eq.index[peak_i]).days)}


def annual_vol(eq):
    r = np.log(eq / eq.shift(1)).dropna()
    r = r[np.isfinite(r)]
    if len(r) < 2:
        return float('nan')
    return float(r.std(ddof=1) * math.sqrt(TRADING_DAYS))


def sharpe(eq):
    """無風險利率 0：日報酬平均 × 252 ÷ 年化波動。"""
    r = (eq / eq.shift(1) - 1).dropna()
    r = r[np.isfinite(r)]
    if len(r) < 2 or r.std(ddof=1) == 0:
        return float('nan')
    return float(r.mean() * TRADING_DAYS / (r.std(ddof=1) * math.sqrt(TRADING_DAYS)))


def calmar(eq):
    m = max_drawdown(eq)['mdd']
    c = cagr(eq)
    return float(c / abs(m)) if m < 0 and np.isfinite(c) else float('nan')


def yearly_returns(eq):
    """每個日曆年的報酬：年底對上一年年底（第一年對起點）。"""
    last = eq.groupby(eq.index.year).last()
    prev = last.shift(1)
    prev.iloc[0] = eq.iloc[0]
    out = {}
    for y, v in (last / prev - 1).items():
        out[str(y)] = float(v)
    return out


def rolling_returns(eq, years):
    """任何一天往前推 N 年的年化報酬，統計最差、中位數、最好和正報酬的比例。資料不夠長回 None。"""
    if _years(eq.index) < years:
        return None
    start = eq.index + pd.DateOffset(years=-years)
    # N 年前那天（或之前最近的一天）的權益
    pos = np.searchsorted(eq.index.values, start.values, side='right') - 1
    ok = pos >= 0
    ann = (eq.values[ok] / eq.values[pos[ok]]) ** (1 / years) - 1
    ann = ann[np.isfinite(ann)]
    if len(ann) == 0:
        return None
    return {'years': years, 'n': int(len(ann)), 'min': float(ann.min()), 'median': float(np.median(ann)),
            'max': float(ann.max()), 'pct_positive': float((ann > 0).mean())}


def xirr(cashflows):
    """內部報酬率（年化，和 Excel XIRR 同一套算法）。cashflows：[(日期, 金額)]，投入為負、拿回為正。"""
    flows = sorted(cashflows, key=lambda x: x[0])
    t0 = flows[0][0]
    ts = np.array([(d - t0).days / 365.0 for d, _ in flows])  # 和 Excel 的 XIRR 一樣用 365 天
    amts = np.array([a for _, a in flows], dtype=float)
    if not ((amts < 0).any() and (amts > 0).any()):
        return float('nan')

    def npv(r):
        return float(np.sum(amts / (1 + r) ** ts))

    lo, hi = -0.9999, 10.0
    f_lo, f_hi = npv(lo), npv(hi)
    if f_lo * f_hi > 0:
        return float('nan')
    for _ in range(200):
        mid = (lo + hi) / 2
        f_mid = npv(mid)
        if abs(f_mid) < 1e-10:
            return float(mid)
        if f_lo * f_mid < 0:
            hi, f_hi = mid, f_mid
        else:
            lo, f_lo = mid, f_mid
    return float((lo + hi) / 2)


def summary(eq):
    mdd = max_drawdown(eq)
    return {'total_return': total_return(eq), 'cagr': cagr(eq), 'mdd': mdd['mdd'], 'mdd_peak': mdd['peak'],
            'mdd_trough': mdd['trough'], 'mdd_recovery': mdd['recovery'], 'mdd_days': mdd['days'],
            'vol': annual_vol(eq), 'sharpe': sharpe(eq), 'calmar': calmar(eq),
            'start': eq.index[0].strftime('%Y-%m-%d'), 'end': eq.index[-1].strftime('%Y-%m-%d'),
            'years': float(_years(eq.index))}
