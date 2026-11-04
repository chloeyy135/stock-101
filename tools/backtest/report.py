"""把一檔標的的全部策略跑完，組成網頁用的結構（可以直接 json.dumps）。"""
import math

from . import engine, metrics, strategies


def _clean(x):
    if isinstance(x, float) and not math.isfinite(x):
        return None
    if isinstance(x, dict):
        return {k: _clean(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_clean(v) for v in x]
    return x


def weekly_points(series, digits=4):
    w = series.resample('W-FRI').last().dropna()
    if len(series) and (len(w) == 0 or w.index[-1] != series.index[-1]):
        w = w.copy()
        w[series.index[-1]] = series.iloc[-1]
    return [[d.strftime('%Y-%m-%d'), round(float(v), digits)] for d, v in w.items()]


def _common(eq, cfg):
    out = {'metrics': metrics.summary(eq), 'yearly': metrics.yearly_returns(eq), 'rolling': {}, 'equity': weekly_points(eq)}
    for y in cfg.get('rolling_years', [1, 3, 5, 10]):
        r = metrics.rolling_returns(eq, y)
        if r:
            out['rolling'][str(y) + 'y'] = r
    return out


def summarize(sym, df, cfg, cost):
    results, skipped = {}, {}
    enough_for_ma = len(df) >= int(cfg.get('min_bars_for_ma', 260))
    for sid, params in cfg['strategies'].items():
        params = dict(params or {})
        if sid == 'dca':
            amount = float(cfg.get('dca_amount', {}).get(sym['market'], params.get('amount', 10000)))
            r = engine.run_dca(df, cost, amount)
            v = r['value']
            # 市值曲線從第一次買進開始；回檔等數字用「市值÷累計投入」避免投入本身造成的成長
            ratio = (v / r['invested_series'].replace(0, float('nan'))).dropna()
            out = {'metrics': {'invested': r['invested'], 'final': float(v.iloc[-1]), 'profit': float(v.iloc[-1]) - r['invested'],
                               'xirr': metrics.xirr(r['cashflows']), 'buys': r['buys'], 'amount': amount,
                               'mdd': metrics.max_drawdown(ratio)['mdd'] if len(ratio) else None,
                               'start': df.index[0].strftime('%Y-%m-%d'), 'end': df.index[-1].strftime('%Y-%m-%d')},
                   'equity': weekly_points(v, 2), 'invested': weekly_points(r['invested_series'], 2)}
            results[sid] = out
            continue
        fn = strategies.TIMING.get(sid)
        if fn is None:
            skipped[sid] = '不認識的策略'
            continue
        if sid != 'buy_hold' and not enough_for_ma:
            skipped[sid] = '日 K 不到 %d 根，不跑均線策略' % int(cfg.get('min_bars_for_ma', 260))
            continue
        pos = fn(df, **params)
        r = engine.run_timing(df, pos, cost)
        out = _common(r['equity'], cfg)
        out['trades'] = len(r['trades'])
        closed = [t['ret'] for t in r['trades'] if t['exit'] is not None]
        out['win_rate'] = (sum(1 for x in closed if x > 0) / len(closed)) if closed else None
        out['exposure'] = r['exposure']
        out['params'] = params
        out['last_position'] = int(pos.iloc[-1])
        results[sid] = out
    return _clean({'symbol': sym, 'bars': len(df), 'first': df.index[0].strftime('%Y-%m-%d'), 'last': df.index[-1].strftime('%Y-%m-%d'),
                   'cost': cost.describe(), 'results': results, 'skipped': skipped})
