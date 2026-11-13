const test = require('node:test');
const assert = require('node:assert');
const Fin = require('../js/financials.js');

const HEAD = '期間結束日,公告日,營收,營業成本,營業利益,稅後淨利,EPS,資產總額,負債總額,流動資產,流動負債,存貨,應收帳款,股東權益,營業現金流,資本支出';
const row = (d, o) => [d, o.report || '', o.rev, o.cogs, o.oi, o.ni, o.eps, o.ta, o.tl, o.ca, o.cl, o.inv, o.ar, o.eq, o.ocf, o.capex].map(v => v == null ? '' : v).join(',');

test('民國年轉西元、非季底與壞格式被擋下', () => {
  assert.strictEqual(Fin.parseDate('114/09/30'), '2025-09-30');
  assert.strictEqual(Fin.parseDate('2025-9-3'), '2025-09-03');
  assert.strictEqual(Fin.parseDate('abc'), null);
  const p = Fin.parseTable(HEAD + '\n2025-08-31,,1,1,1,1,1,1,1,1,1,1,1,1,1,1');
  assert.ok(p.errors[0].includes('不是季底'));
});

test('數字：逗號、括號負數、空值', () => {
  assert.strictEqual(Fin.num('1,234.5'), 1234.5);
  assert.strictEqual(Fin.num('(100)'), -100);
  assert.strictEqual(Fin.num(''), null);
  assert.strictEqual(Fin.num('-'), null);
  assert.ok(Number.isNaN(Fin.num('abc')));
});

test('累計數還原成單季，缺上一季就留空', () => {
  const rows = [
    { date: '2025-03-31', ocf: 100, capex: 40 },
    { date: '2025-06-30', ocf: 250, capex: 90 },
    { date: '2025-12-31', ocf: 600, capex: 200 }
  ];
  const m = Fin.build(rows, { incomeBasis: 'single', cashBasis: 'cumulative' });
  assert.deepStrictEqual(m.quarters.map(q => q.v.ocf), [100, 150, null]);
  assert.deepStrictEqual(m.quarters.map(q => q.v.capex), [40, 50, null]);
  assert.ok(m.notes.some(n => n.includes('缺 2025Q3')));
});

test('單季比率、速動比、天數與 YoY', () => {
  const t = HEAD + '\n' + [
    row('2024-06-30', { rev: 1000, cogs: 600, oi: 250, ni: 200, eps: 2, ta: 5000, tl: 2000, ca: 2000, cl: 1000, inv: 300, ar: 200, eq: 3000, ocf: 300, capex: 100 }),
    row('2025-06-30', { rev: 1200, cogs: 700, oi: 330, ni: 270, eps: 3, ta: 6000, tl: 2400, ca: 2500, cl: 1000, inv: 350, ar: 250, eq: 3600, ocf: 400, capex: -150, report: '2025-08-12' })
  ].join('\n');
  const m = Fin.build(Fin.parseTable(t).rows, { incomeBasis: 'single', cashBasis: 'single' });
  const q = m.quarters[1];
  assert.ok(Math.abs(q.m.gm - 500 / 1200) < 1e-9);
  assert.ok(Math.abs(q.m.opm - 0.275) < 1e-9);
  assert.ok(Math.abs(q.m.quick - 2.15) < 1e-9);
  assert.strictEqual(q.m.fcf, 250);
  assert.ok(Math.abs(q.m.ocfNi - 400 / 270) < 1e-9);
  assert.strictEqual(q.m.days, 91);
  assert.ok(Math.abs(q.m.invDays - 350 / 700 * 91) < 1e-9);
  assert.ok(Math.abs(q.yoyRev - 0.2) < 1e-9);
  assert.ok(Math.abs(q.yoyEps - 0.5) < 1e-9);
  assert.strictEqual(m.quarters[0].yoyRev, null);
  assert.strictEqual(m.noReport, false);
});

test('缺的欄位不補，基期為負不算 YoY，沒公告日會標示', () => {
  const t = HEAD + '\n' + [
    row('2024-03-31', { rev: 100, cogs: 50, oi: 10, ni: -5, eps: -0.5 }),
    row('2025-03-31', { rev: 120, cogs: null, oi: 12, ni: 6, eps: 0.6 })
  ].join('\n');
  const m = Fin.build(Fin.parseTable(t).rows, { incomeBasis: 'single', cashBasis: 'single' });
  const q = m.quarters[1];
  assert.strictEqual(q.m.gm, null);
  assert.strictEqual(q.m.roe, null);
  assert.strictEqual(q.yoyEps, null);
  assert.ok(Math.abs(q.yoyRev - 0.2) < 1e-9);
  assert.strictEqual(m.noReport, true);
  assert.ok(m.notes.some(n => n.includes('沒有提供公告日')));
});

test('公告日早於期間結束日會警告；重複季度會報錯', () => {
  const bad = HEAD + '\n' + row('2025-06-30', { rev: 1, report: '2025-05-01' });
  const m = Fin.build(Fin.parseTable(bad).rows, {});
  assert.ok(m.warns[0].includes('早於期間結束日'));
  const dup = HEAD + '\n' + row('2025-06-30', { rev: 1 }) + '\n' + row('2025-06-30', { rev: 2 });
  assert.ok(Fin.build(Fin.parseTable(dup).rows, {}).error.includes('出現兩次'));
});

test('營業利益率轉折指出是成本率還是費用率', () => {
  const t = HEAD + '\n' + [
    row('2025-03-31', { rev: 1000, cogs: 600, oi: 300 }),
    row('2025-06-30', { rev: 1000, cogs: 700, oi: 200 })
  ].join('\n');
  const m = Fin.build(Fin.parseTable(t).rows, { incomeBasis: 'single', cashBasis: 'single' });
  const out = Fin.turns(m.quarters);
  assert.strictEqual(out.length, 1);
  assert.ok(out[0].includes('營業成本率上升 10.0 個百分點'));
});

test('近 N 季／年只取最後幾季', () => {
  const qs = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ({ key: i }));
  assert.strictEqual(Fin.pickRange(qs, '近 8 季').length, 8);
  assert.strictEqual(Fin.pickRange(qs, '近2年').length, 8);
  assert.strictEqual(Fin.pickRange(qs, '').length, 9);
});
