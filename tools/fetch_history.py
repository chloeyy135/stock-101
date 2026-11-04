#!/usr/bin/env python3
"""用 Yahoo Finance（yfinance）抓 config/backtest.json 裡每檔的全部日線，寫到 data/history/<代號>.csv。
價格是還原後（auto_adjust）的，報酬因此包含配息。每次整檔重抓、整檔覆寫，不做增量合併。

用法（在 repo 根目錄）：
  python3 tools/fetch_history.py                 全部
  python3 tools/fetch_history.py 0050.TW SPY     只抓這幾檔
抓不到的標的會記在 meta.json 的 error，不會讓整個流程失敗。這個腳本在 Claude 的沙盒連不到 Yahoo，請在本機或 GitHub Actions 跑。
"""
import datetime as dt
import json
import os
import sys
import time

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backtest import data  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def load_config():
    with open(os.path.join(ROOT, 'config', 'backtest.json'), encoding='utf-8') as f:
        return json.load(f)


def read_meta(path):
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    return {}


def download(symbol, tries=3):
    import yfinance as yf
    last = None
    for i in range(tries):
        try:
            df = yf.download(symbol, period='max', interval='1d', auto_adjust=True, progress=False, threads=False)
            if df is None or len(df) == 0:
                raise RuntimeError('沒有回傳資料')
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            df = df.rename(columns=str.lower)[data.COLUMNS].astype(float)
            df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
            df.index.name = 'date'
            df = df[~df.index.duplicated(keep='last')].sort_index()
            df = df.dropna()
            df = df[(df['volume'] >= 0) & (df['low'] > 0)]
            # 偶爾有高低價差一點點的壞資料，直接修成合理值（不會影響收盤）
            df['high'] = df[['high', 'open', 'close']].max(axis=1)
            df['low'] = df[['low', 'open', 'close']].min(axis=1)
            return data.validate(df)
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(str(last))


def main(argv):
    cfg = load_config()
    out_dir = os.path.join(ROOT, cfg.get('history_dir', 'data/history'))
    os.makedirs(out_dir, exist_ok=True)
    meta_path = os.path.join(out_dir, 'meta.json')
    meta = read_meta(meta_path)
    want = set(argv) if argv else None
    now = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    failed = 0
    for sym in cfg['symbols']:
        sid = sym['id']
        if want and sid not in want:
            continue
        try:
            df = download(sid)
            data.save_csv(df, os.path.join(out_dir, sid + '.csv'))
            meta[sid] = {'source': 'Yahoo Finance（yfinance，auto_adjust）', 'adjusted': True, 'fetched': now,
                         'first': df.index[0].strftime('%Y-%m-%d'), 'last': df.index[-1].strftime('%Y-%m-%d'), 'bars': int(len(df))}
            print('%-10s %5d 根  %s ～ %s' % (sid, len(df), meta[sid]['first'], meta[sid]['last']))
        except Exception as e:  # noqa: BLE001
            failed += 1
            meta.setdefault(sid, {})['error'] = '%s（%s）' % (str(e)[:200], now)
            print('%-10s 失敗：%s' % (sid, str(e)[:200]), file=sys.stderr)
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write('\n')
    print('寫入', os.path.relpath(meta_path, ROOT), '；失敗', failed, '檔')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
