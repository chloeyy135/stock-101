#!/usr/bin/env python3
"""讀 config/backtest.json 和 data/history/*.csv，把每檔每個策略跑一遍，寫出：
  data/backtest/results.js   網頁用（window.BACKTEST）
  data/backtest/REPORT.md    給人看的摘要表
用法（repo 根目錄）：python3 tools/run_backtest.py
沒有 CSV 的標的會略過並列在 missing。
"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backtest import costs, data, report, strategies  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def pct(x, d=1):
    return '—' if x is None else ('%+.' + str(d) + 'f%%') % (x * 100)


def num(x, d=2):
    return '—' if x is None else ('%.' + str(d) + 'f') % x


def strategy_list(cfg):
    out = []
    for sid, params in cfg['strategies'].items():
        info = strategies.INFO.get(sid, {'name': sid, 'desc': ''})
        out.append({'id': sid, 'name': info['name'], 'desc': info['desc'].format(**(params or {})), 'params': params or {}})
    return out


def markdown(res):
    lines = ['# 回測摘要', '', '產生時間：%s。數字由 tools/run_backtest.py 算出，網頁版在 backtest.html。' % res['generated'], '',
             '價格含息還原（Yahoo Finance）；標「不含息」的是暫用美股日報的未還原日 K。訊號用收盤算、隔天開盤成交；台股含手續費（六折）和交易稅，美股 0 手續費。', '',
             '| 標的 | 區間 | 策略 | 年化報酬 | 總報酬 | 最大回檔 | 年化波動 | 夏普 | 交易次數 |', '|---|---|---|---:|---:|---:|---:|---:|---:|']
    names = {s['id']: s['name'] for s in res['strategies']}
    for sid in res['order']:
        r = res['results'][sid]
        sym = r['symbol']
        label = '%s %s%s' % (sym['name'], sid, '' if r['adjusted'] else '（不含息）')
        span = '%s～%s' % (r['first'], r['last'])
        for st, out in r['results'].items():
            if st == 'dca':
                m = out['metrics']
                lines.append('| %s | %s | %s | %s（XIRR） | 投入 %s → %s | %s | — | — | 買 %d 次 |' % (
                    label, span, names.get(st, st), pct(m['xirr']), num(m['invested'], 0), num(m['final'], 0), pct(m['mdd']), m['buys']))
            else:
                m = out['metrics']
                lines.append('| %s | %s | %s | %s | %s | %s | %s | %s | %d |' % (
                    label, span, names.get(st, st), pct(m['cagr']), pct(m['total_return']), pct(m['mdd']), pct(m['vol']).lstrip('+'), num(m['sharpe']), out['trades']))
        for st, why in r['skipped'].items():
            lines.append('| %s | %s | %s | 略過：%s | | | | | |' % (label, span, names.get(st, st), why))
    if res['missing']:
        lines += ['', '還沒有資料的標的：' + '、'.join(res['missing']) + '（跑 tools/fetch_history.py 之後就會有）']
    lines += ['', '本頁為教育用途，不構成買賣建議。過去績效不代表未來。']
    return '\n'.join(lines) + '\n'


def main():
    cfg = load_json(os.path.join(ROOT, 'config', 'backtest.json'))
    hist = os.path.join(ROOT, cfg.get('history_dir', 'data/history'))
    out_dir = os.path.join(ROOT, cfg.get('output_dir', 'data/backtest'))
    os.makedirs(out_dir, exist_ok=True)
    meta = load_json(os.path.join(hist, 'meta.json'), {})
    results, order, missing = {}, [], []
    for sym in cfg['symbols']:
        sid = sym['id']
        path = os.path.join(hist, sid + '.csv')
        if not os.path.exists(path):
            missing.append(sid)
            continue
        df = data.load_csv(path)
        cost = costs.from_config(cfg['costs'], sym['market'], sym['kind'])
        r = report.summarize(sym, df, cfg, cost)
        m = meta.get(sid, {})
        r['adjusted'] = bool(m.get('adjusted', False))
        r['source'] = m.get('source', '不明')
        r['fetched'] = m.get('fetched')
        results[sid] = r
        order.append(sid)
        bh = r['results'].get('buy_hold', {}).get('metrics', {})
        print('%-10s %5d 根 %s～%s  買進持有 年化 %s 最大回檔 %s' % (sid, r['bars'], r['first'], r['last'], pct(bh.get('cagr')), pct(bh.get('mdd'))))
    res = {'generated': dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).strftime('%Y-%m-%d %H:%M'),
           'strategies': strategy_list(cfg), 'dca_amount': cfg.get('dca_amount', {}), 'costs': cfg['costs'],
           'order': order, 'missing': missing, 'results': results}
    js = ('// 回測結果：由 tools/run_backtest.py 產生，不用手改。資料來源和區間見每檔的 source／first／last。\n'
          'window.BACKTEST = ' + json.dumps(res, ensure_ascii=False, separators=(',', ':')) + ';\n')
    with open(os.path.join(out_dir, 'results.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    with open(os.path.join(out_dir, 'REPORT.md'), 'w', encoding='utf-8') as f:
        f.write(markdown(res))
    print('寫入 %s（%d 檔，%d KB）和 REPORT.md；缺資料 %d 檔' % (os.path.relpath(os.path.join(out_dir, 'results.js'), ROOT), len(order), len(js) // 1024, len(missing)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
