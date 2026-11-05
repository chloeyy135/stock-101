#!/usr/bin/env python3
"""把 Yahoo Finance 日線的 JSON 匯出（Firecrawl 的 finance-yahoo-com / equities/history 回應）
轉成 data/history/<代號>.csv 和 meta.json，格式和 fetch_history.py 一樣。

用法：python3 tools/import_yahoo_json.py <回應.json> [<回應.json> ...]
同一個代號可以給好幾個檔（分段抓的），會依日期合併、同一天以後面的為準。

價格處理：Yahoo 的 open/high/low/close 已經做過分割還原，adj_close 再含配息；
這裡把四個價格都乘上 adj_close/close，變成「含息還原」價，和 yfinance auto_adjust 的結果同義。
成交量用 Yahoo 的分割還原量。配息（除息日、金額）和分割（日期、比例）另外記在 meta。
"""
import datetime as dt
import json
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backtest import data  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SOURCE = 'Yahoo Finance（Firecrawl finance-yahoo-com equities/history，含息還原）'

# Yahoo 已知的資料錯誤，匯入時修正並記在 meta 的 corrections。
# 0050.TW：2025-06 一股拆四股，Yahoo 只把 2014-01-02 以後的價格做了分割還原，2013-12-31 收 58.80、2014-01-02 卻是 14.64。
# 2014 以前的價格要再除以 4、成交量乘以 4，才會連續。
CORRECTIONS = {
    '0050.TW': [{'before': '2014-01-02', 'price_divide': 4, 'why': 'Yahoo 對 2025-06 一拆四只還原了 2014-01-02 以後的資料，2014 前再除以 4、量乘以 4'}],
}


def load_response(path):
    with open(path, encoding='utf-8') as f:
        doc = json.load(f)
    out = []
    for item in doc['data']['alexandria']:
        if item.get('error') or not item.get('data'):
            print('%s：%s' % (os.path.basename(path), item.get('error')), file=sys.stderr)
            continue
        out.append(item['data'])
    return out


def to_frame(bars, repaired):
    rows = []
    prev_close = None
    for b in bars:
        c = float(b['close'])
        if not c or b.get('adj_close') is None:
            continue
        o, h, l = float(b['open'] or 0), float(b['high'] or 0), float(b['low'] or 0)
        # Yahoo 偶爾有 open=0 之類的壞 K（台股 ETF 2009-08-13 就是）：開盤用前一天收盤代替，高低價夾回合理範圍，並記下來
        if o <= 0 or h < max(o, c) or l > min(o, c) or l <= 0:
            repaired.append(b['date'])
            if o <= 0:
                o = prev_close if prev_close else c
            h = max(h, o, c); l = min(l if l > 0 else min(o, c), o, c)
        prev_close = c
        k = float(b['adj_close']) / c
        rows.append({'date': b['date'], 'open': o * k, 'high': h * k, 'low': l * k, 'close': float(b['adj_close']), 'volume': float(b['volume'] or 0)})
    df = pd.DataFrame(rows)
    df['date'] = pd.to_datetime(df['date'])
    df = df.drop_duplicates('date', keep='last').set_index('date').sort_index()
    # 還原係數乘完再四捨五入到 4 位，可能讓 high 比 close 小 0.0001；先進位再把高低價夾回去
    for c in ['open', 'high', 'low', 'close']:
        df[c] = df[c].round(4)
    df['high'] = df[['high', 'open', 'close']].max(axis=1)
    df['low'] = df[['low', 'open', 'close']].min(axis=1)
    return df[data.COLUMNS]


def main(argv):
    if not argv:
        print(__doc__); return 2
    cfg = json.load(open(os.path.join(ROOT, 'config', 'backtest.json'), encoding='utf-8'))
    known = {s['id'] for s in cfg['symbols']}
    out_dir = os.path.join(ROOT, cfg.get('history_dir', 'data/history'))
    os.makedirs(out_dir, exist_ok=True)
    meta_path = os.path.join(out_dir, 'meta.json')
    meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {}
    now = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    by_symbol = {}
    for path in argv:
        for r in load_response(path):
            s = by_symbol.setdefault(r['symbol'], {'frames': [], 'dividends': {}, 'splits': {}, 'repaired': [], 'currency': r.get('currency'), 'name': r.get('name')})
            s['frames'].append(to_frame(r['bars'], s['repaired']))
            for d in r.get('dividends') or []:
                s['dividends'][d['ex_date']] = float(d['amount'])
            for sp in r.get('splits') or []:
                s['splits'][sp['date']] = sp.get('ratio')

    for sid, s in sorted(by_symbol.items()):
        if sid not in known:
            print('%s 不在 config/backtest.json 裡，略過' % sid, file=sys.stderr); continue
        df = pd.concat(s['frames'])
        df = df[~df.index.duplicated(keep='last')].sort_index()
        for fix in CORRECTIONS.get(sid, []):
            m = df.index < pd.Timestamp(fix['before'])
            df.loc[m, ['open', 'high', 'low', 'close']] = (df.loc[m, ['open', 'high', 'low', 'close']] / fix['price_divide']).round(4)
            df.loc[m, 'volume'] = df.loc[m, 'volume'] * fix['price_divide']
            for k in list(s['dividends']):  # 同一段的配息金額也要除
                if k < fix['before']:
                    s['dividends'][k] = round(s['dividends'][k] / fix['price_divide'], 6)
        data.save_csv(df, os.path.join(out_dir, sid + '.csv'))
        meta[sid] = {
            'source': SOURCE, 'adjusted': True, 'fetched': now, 'currency': s['currency'],
            'first': df.index[0].strftime('%Y-%m-%d'), 'last': df.index[-1].strftime('%Y-%m-%d'), 'bars': int(len(df)),
            'dividends': [{'d': k, 'amount': v} for k, v in sorted(s['dividends'].items())],
            'splits': [{'d': k, 'ratio': v} for k, v in sorted(s['splits'].items())],
            'repaired': sorted(set(s['repaired'])),  # 修過的壞 K 日期（開盤為 0 或高低價不合理）
            'corrections': CORRECTIONS.get(sid, []),
        }
        print('%-10s %5d 根  %s ～ %s  配息 %d 次  分割 %d 次  修補 %d 根' % (sid, len(df), meta[sid]['first'], meta[sid]['last'], len(s['dividends']), len(s['splits']), len(set(s['repaired']))))
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write('\n')
    print('寫入', os.path.relpath(meta_path, ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
