#!/usr/bin/env python3
"""把 data/us 既有的美股日 K（美股日報用的 window.US_BARS 檔）轉成 data/history/<代號>.csv，
讓回測頁在第一次跑 fetch_history.py 之前就有東西可以看。
這些是未還原價格（不含配息），meta 會標 adjusted: false；fetch_history.py 跑過之後會整檔覆寫。
只會寫還沒有 CSV 的代號（或加 --force）。用法：python3 tools/import_us_bars.py [--force]
"""
import datetime as dt
import json
import os
import re
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backtest import data  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
US = os.path.join(ROOT, 'data', 'us')
ROW = re.compile(r'\["(\d{4}-\d\d-\d\d)",([-\d.eE]+),([-\d.eE]+),([-\d.eE]+),([-\d.eE]+),([-\d.eE]+)\]')


def collect():
    with open(os.path.join(US, 'index.js'), encoding='utf-8') as f:
        idx = json.loads(f.read().split('window.US_INDEX = ', 1)[1].rstrip().rstrip(';'))
    bars = {}
    for name in idx['files']:
        if not (name.startswith('seed-') or name.startswith('bars-')):
            continue
        text = open(os.path.join(US, name), encoding='utf-8').read()
        # 每個代號的區塊："SPY": [ ... ] 或 { SPY: [ ... ]
        for m in re.finditer(r'["\']?([A-Z]+)["\']?\s*:\s*\[(.*?)\n\]', text, re.S):
            sid, body = m.group(1), m.group(2)
            rows = bars.setdefault(sid, {})
            for r in ROW.finditer(body):
                rows[r.group(1)] = [float(x) for x in r.groups()[1:]]  # 同一天以後面的檔案為準
    return bars


def main(argv):
    force = '--force' in argv
    out_dir = os.path.join(ROOT, 'data', 'history')
    os.makedirs(out_dir, exist_ok=True)
    meta_path = os.path.join(out_dir, 'meta.json')
    meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {}
    now = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    for sid, rows in sorted(collect().items()):
        path = os.path.join(out_dir, sid + '.csv')
        if os.path.exists(path) and not force and meta.get(sid, {}).get('adjusted'):
            print(sid, '已有還原後的資料，略過')
            continue
        df = pd.DataFrame.from_dict(rows, orient='index', columns=data.COLUMNS).astype(float)
        df.index = pd.to_datetime(df.index)
        df.index.name = 'date'
        df = df.sort_index()
        data.save_csv(df, path)
        meta[sid] = {'source': 'data/us 的美股日報日 K（Stocklake，未還原、不含配息）', 'adjusted': False, 'fetched': now,
                     'first': df.index[0].strftime('%Y-%m-%d'), 'last': df.index[-1].strftime('%Y-%m-%d'), 'bars': int(len(df))}
        print('%-6s %4d 根  %s ～ %s' % (sid, len(df), meta[sid]['first'], meta[sid]['last']))
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
