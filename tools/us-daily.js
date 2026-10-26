#!/usr/bin/env node
/* 台股入門 60 天 — 美股日報每天的更新工具（網站本身不會用到這個檔案）
   用法（在 repo 根目錄執行）：
     node tools/us-daily.js snapshot              印出每檔的體檢表、支撐壓力和還沒揭曉的預測，寫日報前看
     node tools/us-daily.js add-bars new.json     把新的日 K 加進 data/us/bars-YYYY-MM.js
     node tools/us-daily.js add-report 2026-10-26 檢查 data/us/report-2026-10-26.js，登記到目錄，抽出練習預測
     node tools/us-daily.js check                 載入全部資料檔，確認格式正確
   new.json 的格式：{ "TSLA": [ { "date": "2026-10-26", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 1 } ], ... }
   （就是 Stocklake get_stock_history 回傳的 history 陣列，每檔一個。）詳細流程見 data/us/README.md。 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'data', 'us');
const INDEX = path.join(DIR, 'index.js');

function load(files) {
  const ctx = { window: {}, document: { getElementById: () => null } };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  return ctx.window;
}

function readIndex() {
  return load([INDEX]).US_INDEX;
}

function writeIndex(idx) {
  idx.files = sortFiles(idx.files);
  idx.reports = [...new Set(idx.reports)].sort();
  const text = '// 美股日報的資料目錄：網頁照這裡列的檔案載入。由 tools/us-daily.js 自動更新，不用手改。\n' +
    'window.US_INDEX = ' + JSON.stringify(idx, null, 2) + ';\n';
  fs.writeFileSync(INDEX, text);
}

function sortFiles(files) {
  const rank = (f) => (f.startsWith('seed-') ? 0 : f.startsWith('bars-') ? 1 : 2);
  return [...new Set(files)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function world(extra) {
  const idx = readIndex();
  const files = [path.join(ROOT, 'js', 'chart.js'), path.join(ROOT, 'js', 'trend-core.js')]
    .concat(idx.files.map((f) => path.join(DIR, f)))
    .concat(extra || []);
  const win = load(files);
  return { idx, win, T: win.TrendCore, bars: win.TrendCore.collect(win) };
}

// 寫一個 push 進 US_BARS 的月檔（或 US_CALLS 的預測檔），一根 K 線一行
function writeMonthBars(file, month, data) {
  const ids = Object.keys(data).sort();
  const body = ids.map((id) => JSON.stringify(id) + ': [\n' +
    data[id].map((r) => JSON.stringify(r)).join(',\n') + '\n]').join(',\n');
  fs.writeFileSync(file, '// ' + month + ' 的美股日線：日期、開盤、最高、最低、收盤、成交量（股）。資料來源：Stocklake 日線資料。\n' +
    '// 每天由 tools/us-daily.js add-bars 加上新的一根，不用手改。\n' +
    '(window.US_BARS = window.US_BARS || []).push({\n' + body + '\n});\n');
}

function addBars(jsonFile) {
  const input = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const { idx, T, bars } = world();
  const ok = new Set(T.SYMBOLS.map((s) => s.id));
  // 種子檔（seed-*.js）不再改；之後的日子都放月檔，重抓到已經有的日子就用新的數字蓋過去（例如成交量事後修正）
  const seeds = T.collect(load(idx.files.filter((f) => f.startsWith('seed-')).map((f) => path.join(DIR, f))));
  const byMonth = {};
  let added = 0, updated = 0;
  for (const id of Object.keys(input)) {
    if (!ok.has(id)) throw new Error('不認識的代號：' + id);
    const list = Array.isArray(input[id]) ? input[id] : input[id].history;
    const seedList = seeds[id] || [];
    const seedLast = seedList.length ? seedList[seedList.length - 1].d : '';
    const known = new Map((bars[id] || []).map((x) => [x.d, x]));
    for (const b of list) {
      const row = [b.date, b.open, b.high, b.low, b.close, b.volume];
      if (!/^\d{4}-\d\d-\d\d$/.test(row[0]) || row.slice(1).some((x) => typeof x !== 'number' || !isFinite(x))) throw new Error('格式不對：' + id + ' ' + JSON.stringify(b));
      if (!(row[2] >= Math.max(row[1], row[4]) && row[3] <= Math.min(row[1], row[4]) && row[3] > 0)) throw new Error('高低價不合理：' + id + ' ' + JSON.stringify(b));
      if (row[0] <= seedLast) continue;
      const old = known.get(row[0]);
      if (old && old.o === row[1] && old.h === row[2] && old.l === row[3] && old.c === row[4] && old.v === row[5]) continue;
      if (old) updated++; else added++;
      const m = row[0].slice(0, 7);
      ((byMonth[m] = byMonth[m] || {})[id] = byMonth[m][id] || []).push(row);
    }
  }
  for (const m of Object.keys(byMonth)) {
    const file = path.join(DIR, 'bars-' + m + '.js');
    const cur = {};
    if (fs.existsSync(file)) {
      for (const chunk of load([file]).US_BARS) for (const id of Object.keys(chunk)) cur[id] = chunk[id];
    }
    for (const id of Object.keys(byMonth[m])) {
      const seen = new Map((cur[id] || []).map((r) => [r[0], r]));
      byMonth[m][id].forEach((r) => seen.set(r[0], r));
      cur[id] = [...seen.values()].sort((a, b) => a[0].localeCompare(b[0]));
    }
    writeMonthBars(file, m, cur);
    idx.files.push('bars-' + m + '.js');
    console.log('寫入', path.relative(ROOT, file));
  }
  writeIndex(idx);
  console.log('新增', added, '根 K 線' + (updated ? '，更新 ' + updated + ' 根' : ''));
}

const DIRS = ['up', 'down', 'flat'];

function addReport(date) {
  if (!/^\d{4}-\d\d-\d\d$/.test(date)) throw new Error('日期格式要像 2026-10-26');
  const file = path.join(DIR, 'report-' + date + '.js');
  const { idx, T, bars } = world([file]);
  const rep = load([file]).US_REPORTS.filter((r) => r.date === date)[0];
  if (!rep) throw new Error(path.basename(file) + ' 裡沒有 date 為 ' + date + ' 的日報');
  for (const k of ['title', 'market', 'tip', 'stocks']) if (!rep[k]) throw new Error('日報缺少 ' + k);
  const calls = [];
  for (const s of T.SYMBOLS) {
    const st = rep.stocks[s.id];
    if (!st) throw new Error('日報缺少 ' + s.id);
    for (const k of ['head', 'points', 'plan', 'call']) if (!st[k]) throw new Error(s.id + ' 缺少 ' + k);
    if (DIRS.indexOf(st.call.dir) < 0 || !(st.call.conf >= 34 && st.call.conf <= 95)) throw new Error(s.id + ' 的 call 要有 dir（up/down/flat）和 conf（34～95，三選一所以至少 34）');
    const list = bars[s.id];
    calls.push({ d: date, s: s.id, base: list[list.length - 1].d, h: 5, dir: st.call.dir, conf: st.call.conf });
  }
  // 練習預測抽到 calls-YYYY-MM.js，網頁用它幫 Claude 記分（不用載入每一份日報）
  const m = date.slice(0, 7);
  const cfile = path.join(DIR, 'calls-' + m + '.js');
  let cur = [];
  if (fs.existsSync(cfile)) cur = [].concat(...load([cfile]).US_CALLS);
  cur = cur.filter((c) => c.d !== date).concat(calls).sort((a, b) => a.d.localeCompare(b.d) || a.s.localeCompare(b.s));
  fs.writeFileSync(cfile, '// ' + m + ' 日報裡的練習預測：d 日報日期、s 代號、base 從哪一天的收盤算起、h 幾個交易日、dir 方向、conf 把握（%）。\n' +
    '// 由 tools/us-daily.js add-report 從日報抽出來，不用手改。\n' +
    '(window.US_CALLS = window.US_CALLS || []).push([\n' + cur.map((c) => JSON.stringify(c)).join(',\n') + '\n]);\n');
  idx.files.push('calls-' + m + '.js');
  idx.reports.push(date);
  idx.updated = date;
  writeIndex(idx);
  console.log('登記日報', date, '，抽出', calls.length, '筆練習預測 →', path.relative(ROOT, cfile));
}

function f2(x) { return isFinite(x) ? x.toFixed(2) : '—'; }
function p1(x) { return isFinite(x) ? (x >= 0 ? '+' : '') + x.toFixed(1) + '%' : '—'; }

function snapshot() {
  const { idx, win, T, bars } = world();
  console.log('資料目錄更新到', idx.updated, '；日報', idx.reports.length, '份');
  for (const s of T.SYMBOLS) {
    const list = bars[s.id];
    if (!list) { console.log('\n' + s.id, '沒有資料'); continue; }
    const a = T.analyze(list);
    console.log('\n== ' + s.id + ' ' + s.name + '  ' + a.date + ' 收 ' + f2(a.close) + '（' + p1(a.chg1) + '）開 ' + f2(a.open) + ' 高 ' + f2(a.high) + ' 低 ' + f2(a.low));
    console.log('  趨勢', T.WORD.trend[a.trend], '｜均線', a.order, '｜MA5', f2(a.ma5), 'MA20', f2(a.ma20), '(' + p1(a.ma20slope) + '/5天)', 'MA60', f2(a.ma60), '(' + p1(a.ma60slope) + '/10天)');
    console.log('  收盤對 MA20', p1(a.vsMa20), '對 MA60', p1(a.vsMa60), '｜5日', p1(a.chg5), '20日', p1(a.chg20), '60日', p1(a.chg60));
    console.log('  MACD DIF', f2(a.dif), 'DEA', f2(a.dea), '柱', f2(a.hist), a.macdCross ? '｜' + a.macdCross.ago + ' 天前' + (a.macdCross.type === 'gold' ? '黃金' : '死亡') + '交叉' : '');
    console.log('  RSI6', f2(a.rsi6), 'RSI12', f2(a.rsi12), '｜K', f2(a.k), 'D', f2(a.d), '｜布林', f2(a.bollDn), '/', f2(a.bollMid), '/', f2(a.bollUp), '位置', f2(a.bollPos));
    console.log('  量比（對前 5 天均量）', f2(a.volRatio), '｜52 週高', f2(a.hi52), a.hi52d, '低', f2(a.lo52), a.lo52d, '距高點', p1(a.fromHi52), '｜年化波動', f2(a.vol20) + '%');
    console.log('  週K', a.weekly.date, '收', f2(a.weekly.close), 'MA5週', f2(a.weekly.ma5), 'MA20週', f2(a.weekly.ma20), '對 MA20週', p1(a.weekly.vsMa20));
    console.log('  壓力', a.levels.res.map((x) => f2(x.p) + '（' + x.why + '）').join('、') || '—');
    console.log('  支撐', a.levels.sup.map((x) => f2(x.p) + '（' + x.why + '）').join('、') || '—');
    const last5 = list.slice(-5).map((b) => b.d.slice(5) + ' ' + f2(b.c)).join('  ');
    console.log('  最近 5 天收盤', last5);
  }
  const calls = [].concat(...(win.US_CALLS || []));
  if (calls.length) {
    console.log('\n== 練習預測');
    for (const c of calls) {
      const o = T.outcome(bars[c.s], c.base, c.h);
      const res = o.done ? '結果 ' + T.WORD.dir[o.dir] + ' ' + p1(o.ret) + (o.dir === c.dir ? ' ✓ 猜對' : ' ✗ 猜錯') : '還差 ' + (o.left || '?') + ' 個交易日';
      console.log('  ' + c.d + ' ' + c.s.padEnd(5) + ' 猜' + T.WORD.dir[c.dir] + '（' + c.conf + '%）從 ' + c.base + ' 起 ' + c.h + ' 天：' + res);
    }
  }
}

function check() {
  const { idx, T, bars } = world();
  for (const s of T.SYMBOLS) {
    const list = bars[s.id];
    if (!list || list.length < 120) throw new Error(s.id + ' 的日 K 不夠');
    console.log(s.id.padEnd(5), list.length, '根', list[0].d, '～', list[list.length - 1].d);
  }
  for (const d of idx.reports) {
    const f = path.join(DIR, 'report-' + d + '.js');
    if (!fs.existsSync(f)) throw new Error('目錄列了 ' + d + ' 的日報，但檔案不存在');
    load([f]);
  }
  console.log('檔案', idx.files.length, '個、日報', idx.reports.length, '份，格式正確');
}

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === 'snapshot') snapshot();
  else if (cmd === 'add-bars' && arg) addBars(arg);
  else if (cmd === 'add-report' && arg) addReport(arg);
  else if (cmd === 'check') check();
  else { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 10).join('\n')); process.exit(1); }
} catch (e) {
  console.error('錯誤：' + e.message);
  process.exit(1);
}
