// 瀏覽器端回測引擎的測試：node --test tests/
// 合成資料答案事先算好；最後一組拿 Python 引擎算好的 data/backtest/results.js 當基準，確認兩邊一致。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const E = require('../js/backtest-engine.js');

function bars(closes, start, opens) {
  const out = []; let t = Date.parse((start || '2020-01-01') + 'T00:00:00Z');
  closes.forEach((c, i) => {
    while ([0, 6].includes(new Date(t).getUTCDay())) t += 86400000;
    const o = opens ? opens[i] : (i ? closes[i - 1] : c);
    out.push({ d: new Date(t).toISOString().slice(0, 10), o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1000 });
    t += 86400000;
  });
  return out;
}
const geo = (n, r) => Array.from({ length: n }, (_, i) => 100 * Math.pow(1 + r, i));
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('資料驗證抓得到高低價錯、重複日期、缺口、零成交量、跳空', () => {
  const b = bars([10, 11, 12, 13, 14]);
  b[1].h = 5; b.push({ ...b[4] }); b[3].v = 0; b.splice(2, 0, { d: '2020-01-20', o: 30, h: 30, l: 30, c: 30, v: 1 });
  const v = E.validate(b.sort((x, y) => (x.d < y.d ? -1 : 1)));
  const types = v.issues.map(i => i.type);
  assert.ok(types.includes('ohlc')); assert.ok(types.includes('order')); assert.ok(types.includes('jump'));
  assert.equal(v.stats.zeroVolume, 1); assert.ok(v.stats.gaps.length >= 1);
  assert.equal(E.validate([]).ok, false);
});

test('成本模型：台股六折手續費、最低 1 元、賣出交易稅；美股零佣金', () => {
  const tw = E.COST_PRESETS.tw_etf;
  near(E.buyCost(tw, 100000), 100000 * 0.001425 * 0.6);
  near(E.sellCost(tw, 100000), 100000 * 0.001425 * 0.6 + 100);
  assert.equal(E.buyCost(tw, 100), 1); // 最低手續費
  assert.equal(E.sellCost(E.COST_PRESETS.us, 5000), 0);
  const cm = { ...E.COST_PRESETS.none, commission: 1, minCommission: 2 };
  assert.equal(E.buyCost(cm, 1000), 2);
});

test('買進持有、不計成本、可碎股：權益等於收盤／第一天開盤', () => {
  const b = bars(geo(50, 0.01));
  const r = E.simulate(b, E.signals(b, 'buy_hold'), { cash0: 1, cost: E.COST_PRESETS.none, fractional: true });
  r.equity.forEach((p, i) => near(p.v, b[i].c / b[0].o, 1e-9));
  assert.equal(r.trades.length, 1); assert.equal(r.trades[0].open, true); near(r.exposure, 1);
});

test('整股成交：買不滿的錢留在現金，期末結清要扣賣出成本', () => {
  const b = bars([10, 10, 10, 10], '2020-01-01', [10, 10, 10, 10]);
  const cm = { ...E.COST_PRESETS.none, feeRate: 0.01, feeDiscount: 1, taxRate: 0.001 };
  const r = E.simulate(b, E.signals(b, 'buy_hold'), { cash0: 1000, cost: cm, closeOut: true });
  // 1000 元、每股 10 元、1% 手續費：99 股 = 990 + 9.9 = 999.9，剩 0.1
  assert.equal(r.trades[0].qty, 99); near(r.equity[0].cash, 0.1, 1e-9);
  const sell = 990, exp = 0.1 + sell - sell * 0.01 - sell * 0.001;
  near(r.equity[r.equity.length - 1].v, exp, 1e-9); near(r.costs.tax, 0.99, 1e-9);
});

test('均線交叉：訊號當天不成交，隔天開盤才進場，暖機期不算績效', () => {
  const c = [10, 9, 8, 7, 6, 7, 9, 12, 15, 18, 20, 22];
  const b = bars(c);
  const s = E.signals(b, 'sma_cross', { fast: 2, slow: 4 });
  assert.equal(s.warmup, 3);
  const first = s.target.findIndex(x => x === 1);
  const r = E.simulate(b, s, { cash0: 1, fractional: true });
  assert.equal(r.equity[0].d, b[3].d);                  // 從暖機完成那天開始記
  assert.equal(r.trades[0].signalDate, b[first].d);
  assert.equal(r.trades[0].entryDate, b[first + 1].d);  // 隔天
  near(r.trades[0].entryPrice, b[first + 1].o);
});

test('停損：收盤跌破門檻，隔天開盤出場，之後要等訊號翻空再翻多才重進', () => {
  const b = bars([10, 10, 10, 8, 8, 8, 8, 9, 11, 12], '2020-01-01', [10, 10, 10, 8, 8, 8, 8, 9, 11, 12]);
  const r = E.simulate(b, E.signals(b, 'buy_hold'), { cash0: 1000, fractional: true, stopLoss: 0.1 });
  assert.equal(r.trades[0].reason, '停損'); assert.equal(r.trades[0].exitDate, b[4].d);
  assert.equal(r.trades.length, 1); // 買進持有的訊號永遠是 1，所以停損後不再進場
});

test('RSI 與 MACD 指標暖機與方向合理', () => {
  const c = geo(80, 0.01).concat(geo(80, -0.01).map(x => x * 2.2));
  const r = E.rsi(c, 14); assert.ok(Number.isNaN(r[13])); assert.ok(r[14] > 95); assert.ok(r[c.length - 1] < 30);
  const m = E.macd(c, 12, 26, 9); assert.ok(Number.isNaN(m.dea[32])); assert.ok(Number.isFinite(m.dea[33]));
  assert.deepEqual(E.validateParams('sma_cross', { fast: 60, slow: 20 }), ['快線天數要小於慢線']);
  assert.deepEqual(E.validateParams('rsi', { n: 14, low: 30, high: 70 }), []);
});

test('定期定額：固定價格下 XIRR＝0、TWR 不變、投入和市值對得上', () => {
  const b = bars(Array(70).fill(10), '2020-01-01', Array(70).fill(10));
  const r = E.dca(b, { amount: 1000, day: 1, freq: 'M', fractional: true });
  assert.equal(r.buys.length, 4); assert.equal(r.investedTotal, 4000); near(r.finalValue, 4000); near(r.xirr, 0, 1e-6);
  near(r.twr[r.twr.length - 1].v, 1, 1e-9); assert.equal(r.twrMdd.mdd, 0);
});

test('定期定額：每月投入日取當月第一個 >= 指定日的交易日；季投與雙週', () => {
  const b = bars(Array(130).fill(10), '2020-01-01', Array(130).fill(10));
  const m = E.dcaDates(b, 15, 'M').map(i => b[i].d);
  assert.equal(m[0], '2020-01-15'); assert.equal(m[1], '2020-02-17'); // 2/15、2/16 是週末
  assert.equal(E.dcaDates(b, 1, 'Q').map(i => b[i].d.slice(0, 7)).join(','), '2020-01,2020-04');
  const bw = E.dcaDates(b, 1, 'BW'); assert.ok(bw.length >= 12);
});

test('XIRR：一年翻倍 = 100%；最大回撤含日期與回本天數；閏年年化', () => {
  near(E.xirr([{ d: '2019-01-01', amount: -1000 }, { d: '2020-01-01', amount: 2000 }]), 1, 1e-4);
  const eq = [[1, '2020-01-02'], [2, '2020-01-03'], [1, '2020-01-06'], [1.5, '2020-01-07'], [2.5, '2020-01-08']].map(x => ({ d: x[1], v: x[0] }));
  const m = E.maxDrawdown(eq); near(m.mdd, -0.5); assert.equal(m.peak, '2020-01-03'); assert.equal(m.trough, '2020-01-06'); assert.equal(m.recovery, '2020-01-08'); assert.equal(m.days, 3); assert.equal(m.recoveryDays, 2);
  const leap = [{ d: '2020-01-01', v: 1 }, { d: '2021-01-01', v: 1.1 }]; // 366 天
  near(E.metrics(leap).cagr, Math.pow(1.1, 365.25 / 366) - 1, 1e-9);
});

test('績效：負報酬、零交易、滾動報酬資料不足要標示', () => {
  const b = bars(geo(300, -0.001));
  const s = E.signals(b, 'sma_filter', { n: 200 });
  const r = E.simulate(b, s, { cash0: 1, fractional: true });
  assert.equal(r.trades.length, 0); near(r.equity[r.equity.length - 1].v, 1); // 一直在均線下，全程空手
  const m = E.metrics(b.map(x => ({ d: x.d, v: x.c })));
  assert.ok(m.total < 0 && m.cagr < 0);
  assert.equal(m.rolling[0].insufficient, undefined); // 1 年有
  assert.equal(m.rolling[1].insufficient, true);      // 3 年不夠
  assert.equal(m.rolling[1].need, 3);
});

test('投資組合：權重要加總 100%、按月再平衡、交集交易日', () => {
  const a = bars(geo(300, 0.001)), b = bars(geo(300, -0.0005));
  b.splice(10, 1); // b 少一天 → 交集少一天
  assert.ok(E.portfolio([{ id: 'A', bars: a, weight: 0.5 }, { id: 'B', bars: b, weight: 0.3 }], {}).error);
  const p = E.portfolio([{ id: 'A', bars: a, weight: 0.6 }, { id: 'B', bars: b, weight: 0.4 }], { cash0: 1e6, rebalance: 'M', fractional: true });
  assert.equal(p.dates.length, 299); assert.ok(p.rebalances >= 13);
  const w = p.equity[p.equity.length - 1].weights; assert.ok(Math.abs(w[0] + w[1] - 1) < 1e-6);
  near(p.riskContribution[0] + p.riskContribution[1], 1, 1e-9);
});

test('網格搜尋只在訓練期選參數，驗證期另外算；walk-forward 有多個視窗', () => {
  const b = bars(geo(600, 0.0005).map((x, i) => x * (1 + 0.05 * Math.sin(i / 20))));
  const grid = [{ fast: 5, slow: 20 }, { fast: 10, slow: 40 }];
  const g = E.gridSearch(b, 'sma_cross', grid, { cash0: 1, fractional: true }, b[400].d);
  assert.equal(g.rows.length, 2); assert.ok(g.rows[0].train && g.rows[0].test); assert.equal(g.trainRange[1] < g.testRange[0], true);
  const wf = E.walkForward(b, 'sma_cross', grid, { cash0: 1, fractional: true }, { trainYears: 1, testMonths: 3 });
  assert.ok(wf.length >= 3); assert.ok(wf.every(w => w.test[0] > w.train[1]));
});

test('Bootstrap 是可重現的統計模擬；情境只在資料涵蓋時計算', () => {
  const eq = bars(geo(500, 0.0004)).map(x => ({ d: x.d, v: x.c }));
  const s1 = E.bootstrap(eq, { paths: 100, horizonDays: 60, seed: 7 }), s2 = E.bootstrap(eq, { paths: 100, horizonDays: 60, seed: 7 });
  assert.deepEqual(s1, s2); assert.ok(s1.ret.p5 <= s1.ret.p95);
  const sc = E.scenarios(eq); // 2020-01 起 500 個交易日：涵蓋疫情急跌，不涵蓋金融海嘯
  assert.equal(sc.find(s => s.id === 'gfc').covered, false); assert.equal(sc.find(s => s.id === 'covid').covered, true);
  assert.ok(Number.isFinite(sc.find(s => s.id === 'covid').mdd));
});

test('和 Python 引擎一致：SPY 買進持有、均線交叉、年線濾網的年化報酬與最大回撤', () => {
  // 日線用進階模式匯出的 data/backtest/bars/SPY.js（和 data/history/SPY.csv 同一份資料，但一定在 repo 裡）
  const bars = fs.readFileSync(path.join(__dirname, '..', 'data', 'backtest', 'bars', 'SPY.js'), 'utf8');
  const rows = JSON.parse(bars.slice(bars.indexOf('= {') + 2, bars.lastIndexOf('}') + 1)).rows;
  const b = rows.map(x => ({ d: x[0], o: x[1], h: x[2], l: x[3], c: x[4], v: x[5] }));
  const src = fs.readFileSync(path.join(__dirname, '..', 'data', 'backtest', 'results.js'), 'utf8');
  const R = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1)).results.SPY.results;
  const check = (strat, p, key) => {
    const sim = E.simulate(b, E.signals(b, strat, p), { cash0: 1, fractional: true, cost: E.COST_PRESETS.none });
    const m = E.metrics(sim.equity);
    // Python 的權益曲線從第一天就開始記（暖機期權益=1），這裡從暖機結束才開始，所以只比總報酬與回撤
    near(m.total, R[key].metrics.total_return, 1e-4);
    near(m.mdd.mdd, R[key].metrics.mdd, 1e-4);
    assert.equal(sim.trades.length, R[key].trades);
  };
  check('buy_hold', {}, 'buy_hold'); check('sma_cross', { fast: 20, slow: 60 }, 'sma_cross'); check('sma_filter', { n: 200 }, 'sma_filter');
});
