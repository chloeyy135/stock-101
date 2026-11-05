#!/usr/bin/env python3
"""把 data/history/*.csv 連同資料品質報告匯出成 data/backtest/bars.js（window.BACKTEST_BARS），
給 backtest.html 的「進階模式」在瀏覽器裡重新計算用。config 裡列了但沒有 CSV 的標的會列在 missing，附原因。
用法（repo 根目錄）：python3 tools/export_bars.py
"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backtest import data  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def quality(df):
    issues = []
    idx = df.index
    gaps = [(a.strftime('%Y-%m-%d'), b.strftime('%Y-%m-%d'), int((b - a).days)) for a, b in zip(idx[:-1], idx[1:]) if (b - a).days > 7]
    zero_vol = int((df['volume'] <= 0).sum())
    jumps = df.index[(df['close'].pct_change().abs() > 0.5).fillna(False)]
    if zero_vol:
        issues.append('有 %d 天成交量為 0' % zero_vol)
    for a, b, d in gaps:
        issues.append('%s 到 %s 之間缺 %d 天（可能是休市或資料缺口）' % (a, b, d))
    for j in jumps:
        issues.append('%s 單日漲跌超過 50%%，可能是未處理的拆併股' % j.strftime('%Y-%m-%d'))
    return {'issues': issues, 'gaps': len(gaps), 'zeroVolume': zero_vol}


def main():
    cfg = json.load(open(os.path.join(ROOT, 'config', 'backtest.json'), encoding='utf-8'))
    hist = os.path.join(ROOT, cfg.get('history_dir', 'data/history'))
    meta_path = os.path.join(hist, 'meta.json')
    meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {}
    out = {'generated': dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).strftime('%Y-%m-%d %H:%M'), 'symbols': {}, 'missing': [], 'order': []}
    for sym in cfg['symbols']:
        sid = sym['id']
        path = os.path.join(hist, sid + '.csv')
        m = meta.get(sid, {})
        if not os.path.exists(path):
            reason = m.get('error', '這個環境連不到 Yahoo Finance／證交所，尚未取得日線；由 GitHub Actions 或本機跑 tools/fetch_history.py 後補上')
            out['missing'].append({'id': sid, 'name': sym['name'], 'market': sym['market'], 'kind': sym['kind'], 'currency': 'TWD' if sym['market'] == 'tw' else 'USD', 'reason': reason})
            continue
        df = data.load_csv(path)
        q = quality(df)
        out['order'].append(sid)
        out['symbols'][sid] = {
            'id': sid, 'name': sym['name'], 'market': sym['market'], 'kind': sym['kind'], 'currency': 'TWD' if sym['market'] == 'tw' else 'USD',
            'source': m.get('source', '不明'), 'adjusted': bool(m.get('adjusted', False)), 'fetched': m.get('fetched'),
            'first': df.index[0].strftime('%Y-%m-%d'), 'last': df.index[-1].strftime('%Y-%m-%d'), 'bars': int(len(df)),
            'dividends': m.get('dividends', []), 'splits': m.get('splits', []), 'quality': q,
            'rows': [[d.strftime('%Y-%m-%d'), round(float(r.open), 4), round(float(r.high), 4), round(float(r.low), 4), round(float(r.close), 4), int(r.volume)] for d, r in zip(df.index, df.itertuples(index=False))]
        }
        print('%-10s %5d 根 %s～%s %s' % (sid, len(df), out['symbols'][sid]['first'], out['symbols'][sid]['last'], '含息還原' if out['symbols'][sid]['adjusted'] else '未還原'))
    out_dir = os.path.join(ROOT, cfg.get('output_dir', 'data/backtest'))
    os.makedirs(out_dir, exist_ok=True)
    js = '// 進階模式用的日線資料：由 tools/export_bars.py 從 data/history 產生，不用手改。每檔有來源、是否還原、區間和資料品質報告。\n' \
         'window.BACKTEST_BARS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open(os.path.join(out_dir, 'bars.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    print('寫入 data/backtest/bars.js（%d 檔有資料、%d 檔缺資料，%d KB）' % (len(out['order']), len(out['missing']), len(js) // 1024))


if __name__ == '__main__':
    main()
