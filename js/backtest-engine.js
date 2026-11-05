/* 台股入門 60 天 — 瀏覽器端回測引擎（純計算，不碰畫面）。
   網頁的 js/backtest-lab.js 和 tests/engine.test.js（node --test）都用這個檔案。
   資料格式：bars = [{ d:'YYYY-MM-DD', o, h, l, c, v }]，由舊到新。
   規則：訊號用 t 日收盤算，t+1 日開盤成交；均線等指標暖機期不算績效；整股成交（可切換允許零股／碎股）。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BacktestEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY = 86400000;
  function dnum(d) { return Date.parse(d + 'T00:00:00Z'); }
  function years(d0, d1) { return (dnum(d1) - dnum(d0)) / DAY / 365.25; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function round(x, k) { var m = Math.pow(10, k === undefined ? 6 : k); return Math.round(x * m) / m; }

  // ---------- 資料品質 ----------
  function validate(bars) {
    var issues = [], zeroVol = 0, gaps = [];
    if (!bars || !bars.length) return { ok: false, issues: [{ type: 'empty', msg: '沒有資料' }], stats: null };
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i];
      if (!/^\d{4}-\d\d-\d\d$/.test(b.d)) issues.push({ type: 'date', date: b.d, msg: '日期格式不對' });
      if (![b.o, b.h, b.l, b.c].every(isNum) || b.l <= 0) issues.push({ type: 'price', date: b.d, msg: '價格不是正數' });
      else if (b.h < Math.max(b.o, b.c) - 1e-9 || b.l > Math.min(b.o, b.c) + 1e-9) issues.push({ type: 'ohlc', date: b.d, msg: '高低價和開收盤不一致' });
      if (!isNum(b.v) || b.v <= 0) zeroVol++;
      if (i > 0) {
        if (b.d <= bars[i - 1].d) issues.push({ type: 'order', date: b.d, msg: b.d === bars[i - 1].d ? '重複的日期' : '日期沒有由舊到新' });
        var gap = (dnum(b.d) - dnum(bars[i - 1].d)) / DAY;
        if (gap > 7) gaps.push({ from: bars[i - 1].d, to: b.d, days: gap });
        if (i > 0 && Math.abs(b.c / bars[i - 1].c - 1) > 0.5) issues.push({ type: 'jump', date: b.d, msg: '單日漲跌超過 50%，可能是未處理的拆併股或錯誤資料' });
      }
    }
    return {
      ok: !issues.length,
      issues: issues,
      stats: { first: bars[0].d, last: bars[bars.length - 1].d, n: bars.length, years: years(bars[0].d, bars[bars.length - 1].d), zeroVolume: zeroVol, gaps: gaps }
    };
  }

  function slice(bars, start, end) {
    return bars.filter(function (b) { return (!start || b.d >= start) && (!end || b.d <= end); });
  }

  // 多檔的共同交集區間（各自的 first 取最大、last 取最小）
  function commonRange(list) {
    var s = null, e = null;
    list.forEach(function (bars) {
      if (!bars.length) return;
      if (!s || bars[0].d > s) s = bars[0].d;
      if (!e || bars[bars.length - 1].d < e) e = bars[bars.length - 1].d;
    });
    return s && e && s <= e ? { start: s, end: e } : null;
  }

  // ---------- 指標 ----------
  function sma(arr, n) {
    var out = new Array(arr.length).fill(NaN), sum = 0;
    for (var i = 0; i < arr.length; i++) {
      sum += arr[i];
      if (i >= n) sum -= arr[i - n];
      if (i >= n - 1) out[i] = sum / n;
    }
    return out;
  }
  function ema(arr, n) {
    var out = new Array(arr.length).fill(NaN), k = 2 / (n + 1), prev = NaN, seed = 0;
    for (var i = 0; i < arr.length; i++) {
      if (i < n - 1) { seed += arr[i]; continue; }
      if (i === n - 1) { seed += arr[i]; prev = seed / n; out[i] = prev; continue; }
      prev = arr[i] * k + prev * (1 - k);
      out[i] = prev;
    }
    return out;
  }
  // Wilder 平滑的 RSI
  function rsi(closes, n) {
    var out = new Array(closes.length).fill(NaN), up = 0, dn = 0;
    for (var i = 1; i < closes.length; i++) {
      var ch = closes[i] - closes[i - 1], g = ch > 0 ? ch : 0, l = ch < 0 ? -ch : 0;
      if (i <= n) { up += g; dn += l; if (i === n) { up /= n; dn /= n; out[i] = dn === 0 ? 100 : 100 - 100 / (1 + up / dn); } continue; }
      up = (up * (n - 1) + g) / n; dn = (dn * (n - 1) + l) / n;
      out[i] = dn === 0 ? 100 : 100 - 100 / (1 + up / dn);
    }
    return out;
  }
  function macd(closes, fast, slow, sig) {
    var ef = ema(closes, fast), es = ema(closes, slow), dif = ef.map(function (x, i) { return x - es[i]; });
    var valid = dif.map(function (x) { return isNum(x) ? x : 0; }), first = dif.findIndex(isNum);
    var dea = new Array(closes.length).fill(NaN), k = 2 / (sig + 1), prev = NaN, seed = 0;
    for (var i = first; i < closes.length; i++) {
      var j = i - first;
      if (j < sig - 1) { seed += valid[i]; continue; }
      if (j === sig - 1) { seed += valid[i]; prev = seed / sig; dea[i] = prev; continue; }
      prev = valid[i] * k + prev * (1 - k); dea[i] = prev;
    }
    return { dif: dif, dea: dea, hist: dif.map(function (x, i) { return x - dea[i]; }) };
  }

  // ---------- 策略：bars → 每天收盤後「想要的持倉」(0/1) 與暖機索引 ----------
  var STRATEGIES = {
    buy_hold: { name: '買進持有', params: [] },
    sma_cross: { name: '均線交叉', params: [{ k: 'fast', label: '快線（天）', def: 20, min: 2, max: 400 }, { k: 'slow', label: '慢線（天）', def: 60, min: 3, max: 500 }] },
    sma_filter: { name: '均線濾網', params: [{ k: 'n', label: '濾網天數', def: 200, min: 5, max: 500 }] },
    rsi: { name: 'RSI 區間', params: [{ k: 'n', label: 'RSI 天數', def: 14, min: 2, max: 100 }, { k: 'low', label: '低於多少買進', def: 30, min: 1, max: 60 }, { k: 'high', label: '高於多少賣出', def: 70, min: 40, max: 99 }] },
    macd: { name: 'MACD 多空', params: [{ k: 'fast', label: '快 EMA', def: 12, min: 2, max: 100 }, { k: 'slow', label: '慢 EMA', def: 26, min: 3, max: 200 }, { k: 'sig', label: '訊號線', def: 9, min: 2, max: 50 }] }
  };

  function validateParams(strat, p) {
    var def = STRATEGIES[strat], errs = [];
    if (!def) return ['不認識的策略 ' + strat];
    def.params.forEach(function (q) {
      var v = p[q.k];
      if (!isNum(v) || v !== Math.floor(v)) errs.push(q.label + ' 要是整數');
      else if (v < q.min || v > q.max) errs.push(q.label + ' 要在 ' + q.min + '～' + q.max + ' 之間');
    });
    if ((strat === 'sma_cross' || strat === 'macd') && !(p.fast < p.slow)) errs.push('快線天數要小於慢線');
    if (strat === 'rsi' && !(p.low < p.high)) errs.push('買進門檻要小於賣出門檻');
    return errs;
  }

  function signals(bars, strat, p) {
    p = p || {};
    var c = bars.map(function (b) { return b.c; }), n = bars.length, target = new Array(n).fill(0), warm = 0, i;
    var enterOnFirstOpen = false;
    if (strat === 'buy_hold') { target.fill(1); warm = 0; enterOnFirstOpen = true; }  // 買進持有不靠任何資訊，第一天開盤就買
    else if (strat === 'sma_cross') {
      var f = sma(c, p.fast), s = sma(c, p.slow); warm = p.slow - 1;
      for (i = warm; i < n; i++) target[i] = f[i] > s[i] ? 1 : 0;
    } else if (strat === 'sma_filter') {
      var m = sma(c, p.n); warm = p.n - 1;
      for (i = warm; i < n; i++) target[i] = c[i] > m[i] ? 1 : 0;
    } else if (strat === 'rsi') {
      var r = rsi(c, p.n); warm = p.n; var pos = 0;
      for (i = warm; i < n; i++) { if (r[i] < p.low) pos = 1; else if (r[i] > p.high) pos = 0; target[i] = pos; }
    } else if (strat === 'macd') {
      var md = macd(c, p.fast, p.slow, p.sig); warm = md.dea.findIndex(isNum); if (warm < 0) warm = n;
      for (i = warm; i < n; i++) target[i] = md.dif[i] > md.dea[i] ? 1 : 0;
    } else throw new Error('不認識的策略 ' + strat);
    return { target: target, warmup: warm, enterOnFirstOpen: enterOnFirstOpen };
  }

  // ---------- 成本模型 ----------
  // 台股：手續費率×折扣（買賣各一次，有最低費）、賣出交易稅；美股：每筆佣金（有最低）、不計 SEC fee；滑價用 bps 加在成交價上。
  var COST_PRESETS = {
    tw_etf: { label: '台股 ETF（假設）', feeRate: 0.001425, feeDiscount: 0.6, minFee: 1, taxRate: 0.001, commission: 0, minCommission: 0, slipBps: 5, currency: 'TWD', lot: 1 },
    tw_stock: { label: '台股股票（假設）', feeRate: 0.001425, feeDiscount: 0.6, minFee: 1, taxRate: 0.003, commission: 0, minCommission: 0, slipBps: 5, currency: 'TWD', lot: 1 },
    us: { label: '美股（假設：零佣金券商）', feeRate: 0, feeDiscount: 1, minFee: 0, taxRate: 0, commission: 0, minCommission: 0, slipBps: 2, currency: 'USD', lot: 1 },
    none: { label: '不計成本', feeRate: 0, feeDiscount: 1, minFee: 0, taxRate: 0, commission: 0, minCommission: 0, slipBps: 0, currency: '', lot: 1 }
  };
  function buyCost(cm, amount) { return Math.max(amount * cm.feeRate * cm.feeDiscount, amount > 0 ? cm.minFee : 0) + (amount > 0 ? Math.max(cm.commission, cm.minCommission) : 0); }
  function sellCost(cm, amount) { return buyCost(cm, amount) + amount * cm.taxRate; }
  function fillPrice(cm, price, side) { return price * (1 + (side === 'buy' ? 1 : -1) * (cm.slipBps || 0) / 10000); }

  // ---------- 單一標的模擬 ----------
  // opts: { cash0, cost, fractional, cashRate, stopLoss, takeProfit, closeOut, dividends:[{d,amount}], reinvest }
  function simulate(bars, sig, opts) {
    opts = opts || {};
    var cm = opts.cost || COST_PRESETS.none, cash = opts.cash0 || 1, shares = 0, n = bars.length;
    var target = sig.target, warm = Math.max(sig.warmup || 0, 0);
    var equity = [], trades = [], open = null, pending = null, blocked = false;
    var costs = { fee: 0, tax: 0, slip: 0 }, invested = 0, turnover = 0, daysIn = 0, dailyRate = (opts.cashRate || 0) / 252;
    var divMap = {}; (opts.dividends || []).forEach(function (x) { divMap[x.d] = (divMap[x.d] || 0) + x.amount; });
    var dividendsReceived = 0, startIdx = warm;
    if (sig.enterOnFirstOpen && target[startIdx] === 1 && bars[startIdx]) pending = { side: 'buy', signalDate: bars[startIdx].d, reason: '起始' };
    for (var i = startIdx; i < n; i++) {
      var b = bars[i];
      // 1) 開盤：執行前一天收盤決定的單
      if (pending) {
        var px = fillPrice(cm, b.o, pending.side);
        if (pending.side === 'buy') {
          var budget = cash, qty = opts.fractional ? budget / px : Math.floor(budget / px / (cm.lot || 1)) * (cm.lot || 1);
          // 扣掉手續費後要買得起
          while (qty > 0 && qty * px + buyCost(cm, qty * px) > cash + 1e-9) qty = opts.fractional ? qty * 0.999 : qty - (cm.lot || 1);
          if (qty > 0) {
            var amt = qty * px, fee = buyCost(cm, amt);
            cash -= amt + fee; shares += qty; costs.fee += fee; costs.slip += qty * (px - b.o); turnover += amt;
            open = { signalDate: pending.signalDate, execDate: b.d, price: px, qty: qty, fee: fee, cost: amt + fee, reason: pending.reason };
          }
        } else if (shares > 0) {
          var amt2 = shares * px, sc = sellCost(cm, amt2), tax = amt2 * cm.taxRate;
          cash += amt2 - sc; costs.fee += sc - tax; costs.tax += tax; costs.slip += shares * (b.o - px); turnover += amt2;
          trades.push({ signalDate: open.signalDate, entryDate: open.execDate, entryPrice: open.price, qty: open.qty, entryFee: open.fee,
            exitSignal: pending.signalDate, exitDate: b.d, exitPrice: px, exitFee: sc - tax, tax: tax, reason: pending.reason,
            pnl: (amt2 - sc) - open.cost, ret: (amt2 - sc) / open.cost - 1, days: Math.round((dnum(b.d) - dnum(open.execDate)) / DAY) });
          shares = 0; open = null;
        }
        pending = null;
      }
      // 2) 現金利息、配息
      if (dailyRate && cash > 0) cash += cash * dailyRate;
      if (divMap[b.d] && shares > 0) { var dv = divMap[b.d] * shares; cash += dv; dividendsReceived += dv; }
      // 3) 收盤：記權益、檢查停損停利、決定明天的單
      var value = cash + shares * b.c;
      equity.push({ d: b.d, v: value, cash: cash, shares: shares });
      if (shares > 0) daysIn++;
      var want = target[i];
      if (open && shares > 0) {
        var r = b.c / open.price - 1;
        if (isNum(opts.stopLoss) && opts.stopLoss > 0 && r <= -opts.stopLoss) { pending = { side: 'sell', signalDate: b.d, reason: '停損' }; blocked = true; continue; }
        if (isNum(opts.takeProfit) && opts.takeProfit > 0 && r >= opts.takeProfit) { pending = { side: 'sell', signalDate: b.d, reason: '停利' }; blocked = true; continue; }
      }
      if (blocked && want === 0) blocked = false;        // 停損後等訊號翻空再翻多才重進
      if (want === 1 && shares === 0 && !blocked && i < n - 1) pending = { side: 'buy', signalDate: b.d, reason: '訊號' };
      else if (want === 0 && shares > 0) pending = { side: 'sell', signalDate: b.d, reason: '訊號' };
    }
    // 期末：還抱著的部位，可選擇用最後一天收盤計算賣出成本
    if (open && shares > 0) {
      var last = bars[n - 1], amtL = shares * last.c, scL = opts.closeOut ? sellCost(cm, amtL) : 0;
      trades.push({ signalDate: open.signalDate, entryDate: open.execDate, entryPrice: open.price, qty: open.qty, entryFee: open.fee,
        exitSignal: null, exitDate: null, exitPrice: last.c, exitFee: opts.closeOut ? scL - amtL * cm.taxRate : 0, tax: opts.closeOut ? amtL * cm.taxRate : 0,
        reason: opts.closeOut ? '期末結清' : '持有中', pnl: amtL - scL - open.cost, ret: (amtL - scL) / open.cost - 1, open: !opts.closeOut,
        days: Math.round((dnum(last.d) - dnum(open.execDate)) / DAY) });
      if (opts.closeOut) { equity[equity.length - 1].v -= scL; costs.fee += scL - amtL * cm.taxRate; costs.tax += amtL * cm.taxRate; }
    }
    costs.total = costs.fee + costs.tax + costs.slip;
    return { equity: equity, trades: trades, costs: costs, exposure: equity.length ? daysIn / equity.length : 0,
      turnover: turnover / (opts.cash0 || 1), dividends: dividendsReceived, warmupBars: startIdx, startDate: bars[startIdx] ? bars[startIdx].d : null };
  }

  // ---------- 定期定額 ----------
  // opts: { amount, day (每月幾號，取當月第一個 >= day 的交易日), freq: 'M'|'Q'|'BW', variant: 'fixed'|'dip'|'tranche', dipPct, dipMult, lookback, tranches, cost, fractional, cashRate }
  function dcaDates(bars, day, freq) {
    var out = [], seen = {}, lastBW = -Infinity;
    for (var i = 0; i < bars.length; i++) {
      var d = bars[i].d, ym = d.slice(0, 7), dd = +d.slice(8, 10), month = +d.slice(5, 7);
      if (freq === 'BW') { var t = dnum(d); if (t - lastBW >= 14 * DAY) { out.push(i); lastBW = t; } continue; }
      if (freq === 'Q' && (month - 1) % 3 !== 0) continue;
      if (seen[ym]) continue;
      if (dd >= (day || 1) || (i + 1 < bars.length && bars[i + 1].d.slice(0, 7) !== ym)) { out.push(i); seen[ym] = true; }
    }
    return out;
  }
  function dca(bars, opts) {
    opts = opts || {};
    var cm = opts.cost || COST_PRESETS.none, amount = opts.amount || 10000, idxs = dcaDates(bars, opts.day, opts.freq || 'M');
    var variant = opts.variant || 'fixed', buySet = {}, k;
    if (variant === 'tranche') { var tr = Math.max(1, opts.tranches || 12); idxs = idxs.slice(0, tr); amount = (opts.amount || 10000) * tr / tr; }
    idxs.forEach(function (i) { buySet[i] = true; });
    var hi = -Infinity, shares = 0, cash = 0, invested = 0, value = [], investedSeries = [], flows = [], buys = [], twr = 1, prevV = 0, twrSeries = [];
    var costs = { fee: 0, slip: 0 }, dailyRate = (opts.cashRate || 0) / 252, lookback = opts.lookback || 60, closes = bars.map(function (b) { return b.c; });
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i];
      if (dailyRate && cash > 0) cash += cash * dailyRate;
      if (buySet[i]) {
        var amt = amount;
        if (variant === 'dip') {
          var from = Math.max(0, i - lookback), recentHi = Math.max.apply(null, closes.slice(from, i + 1));
          if (b.o / recentHi - 1 <= -(opts.dipPct || 0.1)) amt = amount * (opts.dipMult || 2);
        }
        var px = fillPrice(cm, b.o, 'buy'), fee = buyCost(cm, amt), net = amt - fee;
        var qty = opts.fractional ? net / px : Math.floor(net / px / (cm.lot || 1)) * (cm.lot || 1);
        var spent = qty * px + fee, leftover = amt - spent;
        shares += qty; cash += leftover; invested += amt; costs.fee += fee; costs.slip += qty * (px - b.o);
        flows.push({ d: b.d, amount: -amt });
        buys.push({ date: b.d, price: px, qty: qty, amount: amt, fee: fee });
        // TWR：資金流入前先結算上一期的報酬
        var vBefore = prevV; // 流入前的市值（用前一天的）
        if (vBefore > 0) { /* 用前一天收盤到今天開盤的變化無法精確分離，近似以收盤計算 */ }
      }
      var v = cash + shares * b.c;
      // 時間加權：今天報酬 = (今天市值 - 今天流入) / 昨天市值 - 1
      var inflow = buySet[i] ? (buys[buys.length - 1].amount) : 0;
      if (prevV > 0) twr *= (v - inflow) / prevV;
      twrSeries.push({ d: b.d, v: twr });
      prevV = v; value.push({ d: b.d, v: v }); investedSeries.push({ d: b.d, v: invested });
    }
    var last = bars[bars.length - 1], finalV = value.length ? value[value.length - 1].v : 0;
    flows.push({ d: last.d, amount: finalV });
    var ratio = value.map(function (p, i) { return { d: p.d, v: investedSeries[i].v > 0 ? p.v / investedSeries[i].v : NaN }; }).filter(function (p) { return isNum(p.v); });
    return { value: value, invested: investedSeries, buys: buys, investedTotal: invested, finalValue: finalV, unrealized: finalV - invested,
      xirr: xirr(flows), twr: twrSeries, twrMdd: maxDrawdown(twrSeries), ratioMdd: ratio.length ? maxDrawdown(ratio) : null,
      costs: costs, flows: flows, sellCostIfClosed: sellCost(cm, shares * last.c) };
  }

  // ---------- 投資組合（同幣別、交集交易日、定期或門檻再平衡） ----------
  // items: [{ id, bars, weight, cost }]；opts: { cash0, cashWeight, rebalance: 'none'|'M'|'Q'|'Y'|'T', threshold, fractional, cashRate }
  function portfolio(items, opts) {
    opts = opts || {};
    var ids = items.map(function (x) { return x.id; });
    var dateSets = items.map(function (x) { var s = {}; x.bars.forEach(function (b, i) { s[b.d] = i; }); return s; });
    var dates = items[0].bars.map(function (b) { return b.d; }).filter(function (d) { return dateSets.every(function (s) { return d in s; }); });
    if (dates.length < 2) return { error: '這些標的沒有足夠的共同交易日' };
    var wSum = items.reduce(function (a, x) { return a + x.weight; }, 0) + (opts.cashWeight || 0);
    if (Math.abs(wSum - 1) > 1e-6) return { error: '權重加總要等於 100%，現在是 ' + round(wSum * 100, 2) + '%' };
    var cash = opts.cash0 || 1000000, shares = ids.map(function () { return 0; }), equity = [], trades = [], costs = { fee: 0, tax: 0, slip: 0 }, turnover = 0;
    var pendingRebalance = true, lastKey = null, dailyRate = (opts.cashRate || 0) / 252, rebalCount = 0;
    function period(d) { var m = +d.slice(5, 7); return opts.rebalance === 'M' ? d.slice(0, 7) : opts.rebalance === 'Q' ? d.slice(0, 4) + 'Q' + Math.ceil(m / 3) : opts.rebalance === 'Y' ? d.slice(0, 4) : 'none'; }
    for (var t = 0; t < dates.length; t++) {
      var d = dates[t], rows = items.map(function (x, k) { return x.bars[dateSets[k][d]]; });
      if (pendingRebalance) {
        var total = cash + rows.reduce(function (a, r, k) { return a + shares[k] * r.o; }, 0);
        // 先賣超配的，再買低配的
        var orders = items.map(function (x, k) {
          var targetVal = total * x.weight, cur = shares[k] * rows[k].o, diff = targetVal - cur, cm = x.cost || COST_PRESETS.none;
          var px = fillPrice(cm, rows[k].o, diff > 0 ? 'buy' : 'sell'), qty = Math.abs(diff) / px;
          if (!opts.fractional) qty = Math.floor(qty / (cm.lot || 1)) * (cm.lot || 1);
          return { k: k, side: diff > 0 ? 'buy' : 'sell', qty: qty, px: px, cm: cm };
        });
        orders.filter(function (o) { return o.side === 'sell' && o.qty > 0; }).concat(orders.filter(function (o) { return o.side === 'buy' && o.qty > 0; })).forEach(function (o) {
          if (o.side === 'sell') { o.qty = Math.min(o.qty, shares[o.k]); if (o.qty <= 0) return; var amt = o.qty * o.px, sc = sellCost(o.cm, amt); cash += amt - sc; shares[o.k] -= o.qty; costs.fee += sc - amt * o.cm.taxRate; costs.tax += amt * o.cm.taxRate; turnover += amt; }
          else { var q = o.qty; while (q > 0 && q * o.px + buyCost(o.cm, q * o.px) > cash) q = opts.fractional ? q * 0.999 : q - (o.cm.lot || 1); if (q <= 0) return; var a2 = q * o.px, f2 = buyCost(o.cm, a2); cash -= a2 + f2; shares[o.k] += q; costs.fee += f2; turnover += a2; o.qty = q; }
          costs.slip += o.qty * Math.abs(o.px - rows[o.k].o);
          trades.push({ date: d, id: ids[o.k], side: o.side === 'buy' ? '買' : '賣', qty: o.qty, price: o.px });
        });
        rebalCount++; pendingRebalance = false;
      }
      if (dailyRate && cash > 0) cash += cash * dailyRate;
      var v = cash + rows.reduce(function (a, r, k) { return a + shares[k] * r.c; }, 0);
      var w = items.map(function (x, k) { return shares[k] * rows[k].c / v; });
      equity.push({ d: d, v: v, weights: w, cash: cash / v });
      // 決定明天開盤要不要再平衡
      if (opts.rebalance === 'M' || opts.rebalance === 'Q' || opts.rebalance === 'Y') {
        var key = period(d), next = dates[t + 1]; if (next && period(next) !== key) pendingRebalance = true;
      } else if (opts.rebalance === 'T') {
        if (items.some(function (x, k) { return Math.abs(w[k] - x.weight) > (opts.threshold || 0.05); })) pendingRebalance = true;
      }
    }
    costs.total = costs.fee + costs.tax + costs.slip;
    // 風險貢獻：用各檔日報酬的共變異數近似
    var rets = items.map(function (x, k) { var r = []; for (var t = 1; t < dates.length; t++) { var a = x.bars[dateSets[k][dates[t]]].c, b = x.bars[dateSets[k][dates[t - 1]]].c; r.push(a / b - 1); } return r; });
    var cov = rets.map(function (ra) { return rets.map(function (rb) { return covariance(ra, rb); }); });
    var wts = items.map(function (x) { return x.weight; }), portVar = 0, contrib = [];
    wts.forEach(function (wi, i) { wts.forEach(function (wj, j) { portVar += wi * wj * cov[i][j]; }); });
    wts.forEach(function (wi, i) { var mc = 0; wts.forEach(function (wj, j) { mc += wj * cov[i][j]; }); contrib.push(portVar > 0 ? wi * mc / portVar : 0); });
    return { equity: equity, trades: trades, costs: costs, turnover: turnover / (opts.cash0 || 1), rebalances: rebalCount, dates: dates, riskContribution: contrib, correlation: correlationMatrix(rets) };
  }

  // ---------- 統計 ----------
  function returns(eq) { var r = []; for (var i = 1; i < eq.length; i++) r.push(eq[i].v / eq[i - 1].v - 1); return r; }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : NaN; }
  function sd(a) { if (a.length < 2) return NaN; var m = mean(a); return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (a.length - 1)); }
  function covariance(a, b) { var n = Math.min(a.length, b.length); if (n < 2) return NaN; var ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n)), s = 0; for (var i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb); return s / (n - 1); }
  function correlationMatrix(rets) { return rets.map(function (a) { return rets.map(function (b) { var c = covariance(a, b); return c / (sd(a) * sd(b)); }); }); }

  function maxDrawdown(eq) {
    if (!eq || !eq.length) return { mdd: 0 };
    var peak = -Infinity, peakI = 0, best = { mdd: 0, peak: null, trough: null, recovery: null, days: 0, recoveryDays: null }, curPeakI = 0;
    for (var i = 0; i < eq.length; i++) {
      if (eq[i].v > peak) { peak = eq[i].v; curPeakI = i; }
      var dd = eq[i].v / peak - 1;
      if (dd < best.mdd) { best = { mdd: dd, peakI: curPeakI, troughI: i }; }
    }
    if (best.mdd === 0) return { mdd: 0, peak: null, trough: null, recovery: null, days: 0, recoveryDays: null };
    var pv = eq[best.peakI].v, rec = null;
    for (var j = best.troughI; j < eq.length; j++) if (eq[j].v >= pv) { rec = j; break; }
    return { mdd: best.mdd, peak: eq[best.peakI].d, trough: eq[best.troughI].d, recovery: rec !== null ? eq[rec].d : null,
      days: Math.round((dnum(eq[best.troughI].d) - dnum(eq[best.peakI].d)) / DAY), recoveryDays: rec !== null ? Math.round((dnum(eq[rec].d) - dnum(eq[best.troughI].d)) / DAY) : null };
  }
  function underwater(eq) { var peak = -Infinity; return eq.map(function (p) { if (p.v > peak) peak = p.v; return { d: p.d, v: p.v / peak - 1 }; }); }
  function cagr(eq) { var y = years(eq[0].d, eq[eq.length - 1].d); return y > 0 ? Math.pow(eq[eq.length - 1].v / eq[0].v, 1 / y) - 1 : NaN; }
  function yearlyReturns(eq) {
    var out = {}, lastByYear = {}, order = [];
    eq.forEach(function (p) { var y = p.d.slice(0, 4); if (!(y in lastByYear)) order.push(y); lastByYear[y] = p.v; });
    var prev = eq[0].v; order.forEach(function (y) { out[y] = lastByYear[y] / prev - 1; prev = lastByYear[y]; });
    return out;
  }
  function monthlyReturns(eq) {
    var out = [], last = {}, order = [];
    eq.forEach(function (p) { var m = p.d.slice(0, 7); if (!(m in last)) order.push(m); last[m] = p.v; });
    var prev = eq[0].v; order.forEach(function (m) { out.push({ ym: m, r: last[m] / prev - 1 }); prev = last[m]; });
    return out;
  }
  // 任何一天往前 N 年的年化報酬；資料不夠長回 { insufficient: true }
  function rolling(eq, yrs) {
    if (years(eq[0].d, eq[eq.length - 1].d) < yrs) return { years: yrs, insufficient: true, need: yrs, have: round(years(eq[0].d, eq[eq.length - 1].d), 2) };
    var res = [], j = 0;
    for (var i = 0; i < eq.length; i++) {
      var t0 = dnum(eq[i].d) - yrs * 365.25 * DAY; if (t0 < dnum(eq[0].d)) continue;
      while (j + 1 < eq.length && dnum(eq[j + 1].d) <= t0) j++;
      res.push(Math.pow(eq[i].v / eq[j].v, 1 / yrs) - 1);
    }
    if (!res.length) return { years: yrs, insufficient: true };
    var s = res.slice().sort(function (a, b) { return a - b; });
    return { years: yrs, n: res.length, min: s[0], p25: s[Math.floor(s.length * 0.25)], median: s[Math.floor(s.length / 2)], p75: s[Math.floor(s.length * 0.75)], max: s[s.length - 1], pctPositive: res.filter(function (x) { return x > 0; }).length / res.length, values: res };
  }
  function metrics(eq, opts) {
    opts = opts || {};
    if (!eq || eq.length < 2) return null;
    var r = returns(eq), rf = (opts.rf || 0) / 252, ex = r.map(function (x) { return x - rf; });
    var vol = sd(r) * Math.sqrt(252), down = r.filter(function (x) { return x < rf; }).map(function (x) { return x - rf; });
    var dsd = down.length > 1 ? Math.sqrt(down.reduce(function (s, x) { return s + x * x; }, 0) / r.length) * Math.sqrt(252) : NaN;
    var mdd = maxDrawdown(eq), c = cagr(eq), sorted = r.slice().sort(function (a, b) { return a - b; });
    var m = monthlyReturns(eq), best = m.reduce(function (a, x) { return x.r > a.r ? x : a; }, m[0]), worst = m.reduce(function (a, x) { return x.r < a.r ? x : a; }, m[0]);
    return {
      start: eq[0].d, end: eq[eq.length - 1].d, years: years(eq[0].d, eq[eq.length - 1].d), bars: eq.length,
      total: eq[eq.length - 1].v / eq[0].v - 1, cagr: c, vol: vol,
      sharpe: isNum(vol) && vol > 0 ? mean(ex) * 252 / vol : NaN, sortino: isNum(dsd) && dsd > 0 ? mean(ex) * 252 / dsd : NaN,
      mdd: mdd, calmar: mdd.mdd < 0 && isNum(c) ? c / Math.abs(mdd.mdd) : NaN,
      var95: sorted.length ? sorted[Math.floor(sorted.length * 0.05)] : NaN, cvar95: sorted.length ? mean(sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.05)))) : NaN,
      bestMonth: best, worstMonth: worst, yearly: yearlyReturns(eq), monthly: m,
      rolling: (opts.rollingYears || [1, 3, 5, 10]).map(function (y) { return rolling(eq, y); })
    };
  }
  function rollingVol(eq, window) { var r = returns(eq), out = []; for (var i = window; i <= r.length; i++) out.push({ d: eq[i].d, v: sd(r.slice(i - window, i)) * Math.sqrt(252) }); return out; }
  function tradeStats(trades) {
    var closed = trades.filter(function (t) { return !t.open; }), wins = closed.filter(function (t) { return t.pnl > 0; });
    var gp = wins.reduce(function (a, t) { return a + t.pnl; }, 0), gl = closed.filter(function (t) { return t.pnl <= 0; }).reduce(function (a, t) { return a + t.pnl; }, 0);
    return { trades: trades.length, closed: closed.length, winRate: closed.length ? wins.length / closed.length : NaN, avgRet: closed.length ? mean(closed.map(function (t) { return t.ret; })) : NaN,
      profitFactor: gl < 0 ? gp / -gl : NaN, avgDays: closed.length ? mean(closed.map(function (t) { return t.days; })) : NaN };
  }

  // XIRR：和 Excel 同一套（365 天），二分法
  function xirr(flows) {
    if (!flows || flows.length < 2) return NaN;
    var t0 = dnum(flows[0].d), ts = flows.map(function (f) { return (dnum(f.d) - t0) / DAY / 365; }), a = flows.map(function (f) { return f.amount; });
    if (!a.some(function (x) { return x < 0; }) || !a.some(function (x) { return x > 0; })) return NaN;
    function npv(r) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] / Math.pow(1 + r, ts[i]); return s; }
    var lo = -0.9999, hi = 10, flo = npv(lo), fhi = npv(hi);
    if (flo * fhi > 0) return NaN;
    for (var k = 0; k < 200; k++) { var mid = (lo + hi) / 2, fm = npv(mid); if (Math.abs(fm) < 1e-10) return mid; if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
    return (lo + hi) / 2;
  }

  // ---------- 進階研究 ----------
  // 參數敏感度：在訓練期跑格子，用同一組參數看驗證期（避免用同一段資料選參數又說是驗證）
  function gridSearch(bars, strat, grid, opts, splitDate) {
    var train = bars.filter(function (b) { return b.d < splitDate; }), test = bars.filter(function (b) { return b.d >= splitDate; });
    var out = [];
    grid.forEach(function (p) {
      if (validateParams(strat, p).length) return;
      var row = { params: p };
      [['train', train], ['test', test], ['all', bars]].forEach(function (pair) {
        var bs = pair[1]; if (bs.length < 30) { row[pair[0]] = null; return; }
        var s = signals(bs, strat, p); if (s.warmup >= bs.length - 5) { row[pair[0]] = null; return; }
        var sim = simulate(bs, s, opts), m = metrics(sim.equity); row[pair[0]] = m ? { cagr: m.cagr, mdd: m.mdd.mdd, sharpe: m.sharpe, trades: sim.trades.length } : null;
      });
      out.push(row);
    });
    return { rows: out, trainRange: train.length ? [train[0].d, train[train.length - 1].d] : null, testRange: test.length ? [test[0].d, test[test.length - 1].d] : null };
  }
  // Walk-forward：每個視窗在訓練段選最佳（依 Sharpe），拿到接下來的測試段跑
  function walkForward(bars, strat, grid, opts, cfg) {
    var trainBars = Math.round((cfg.trainYears || 2) * 252), testBars = Math.round((cfg.testMonths || 6) * 21), windows = [];
    for (var s = 0; s + trainBars + testBars <= bars.length; s += testBars) {
      var tr = bars.slice(s, s + trainBars), te = bars.slice(s + trainBars - 0, s + trainBars + testBars), best = null;
      grid.forEach(function (p) {
        if (validateParams(strat, p).length) return;
        var sg = signals(tr, strat, p); if (sg.warmup >= tr.length - 5) return;
        var m = metrics(simulate(tr, sg, opts).equity); if (!m) return;
        if (!best || (isNum(m.sharpe) && m.sharpe > best.sharpe)) best = { p: p, sharpe: m.sharpe, cagr: m.cagr };
      });
      if (!best) continue;
      // 測試段要帶著足夠的暖機資料
      var warmNeed = Math.max.apply(null, Object.keys(best.p).map(function (k) { return best.p[k]; })), ext = bars.slice(Math.max(0, s + trainBars - warmNeed), s + trainBars + testBars);
      var sgT = signals(ext, strat, best.p), simT = simulate(ext, sgT, opts), eqT = simT.equity.filter(function (p) { return p.d >= te[0].d; });
      var mT = eqT.length > 2 ? metrics(eqT) : null, bh = metrics(te.map(function (b) { return { d: b.d, v: b.c }; }));
      windows.push({ train: [tr[0].d, tr[tr.length - 1].d], test: [te[0].d, te[te.length - 1].d], params: best.p, trainSharpe: best.sharpe, testCagr: mT ? mT.cagr : NaN, testMdd: mT ? mT.mdd.mdd : NaN, bhCagr: bh ? bh.cagr : NaN });
    }
    return windows;
  }
  // 成本敏感度：同一策略在不同成本倍數下的年化報酬
  function costSensitivity(bars, strat, p, opts, multipliers) {
    var base = opts.cost || COST_PRESETS.none;
    return multipliers.map(function (m) {
      var cm = {}; Object.keys(base).forEach(function (k) { cm[k] = base[k]; });
      ['feeRate', 'taxRate', 'commission', 'minCommission', 'minFee', 'slipBps'].forEach(function (k) { cm[k] = base[k] * m; });
      var o = Object.assign({}, opts, { cost: cm }), sim = simulate(bars, signals(bars, strat, p), o), mt = metrics(sim.equity);
      return { multiplier: m, cagr: mt ? mt.cagr : NaN, total: mt ? mt.total : NaN, costs: sim.costs.total };
    });
  }
  // Bootstrap：把歷史日報酬分塊重抽（統計模擬，不是真實行情）
  function bootstrap(eq, cfg) {
    var r = returns(eq), n = cfg.paths || 500, h = cfg.horizonDays || 252, block = cfg.block || 10, seed = cfg.seed || 42;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    var finals = [], mdds = [];
    for (var k = 0; k < n; k++) {
      var v = 1, peak = 1, mdd = 0, i = 0;
      while (i < h) { var s = Math.floor(rnd() * (r.length - block)); for (var j = 0; j < block && i < h; j++, i++) { v *= 1 + r[s + j]; if (v > peak) peak = v; mdd = Math.min(mdd, v / peak - 1); } }
      finals.push(v - 1); mdds.push(mdd);
    }
    finals.sort(function (a, b) { return a - b; }); mdds.sort(function (a, b) { return a - b; });
    function q(a, p) { return a[Math.min(a.length - 1, Math.floor(a.length * p))]; }
    return { paths: n, horizonDays: h, block: block, ret: { p5: q(finals, 0.05), p25: q(finals, 0.25), p50: q(finals, 0.5), p75: q(finals, 0.75), p95: q(finals, 0.95) }, mdd: { p5: q(mdds, 0.05), p50: q(mdds, 0.5), p95: q(mdds, 0.95) }, probLoss: finals.filter(function (x) { return x < 0; }).length / n };
  }
  // 歷史情境：只在資料涵蓋整段時計算
  var SCENARIOS = [
    { id: 'gfc', name: '金融海啸（2007-10-09 高點到 2009-03-09 低點）', start: '2007-10-09', end: '2009-03-09' },
    { id: 'covid', name: '疫情急跌（2020-02-19 到 2020-03-23）', start: '2020-02-19', end: '2020-03-23' },
    { id: 'hike2022', name: '2022 年升息（2022-01-03 到 2022-10-12）', start: '2022-01-03', end: '2022-10-12' },
    { id: 'tariff2025', name: '2025 年 4 月關稅震盪（2025-04-02 到 2025-04-08）', start: '2025-04-02', end: '2025-04-08' }
  ];
  function scenarios(eq) {
    return SCENARIOS.map(function (s) {
      var covered = eq.length && eq[0].d <= s.start && eq[eq.length - 1].d >= s.end;
      if (!covered) return { id: s.id, name: s.name, covered: false };
      var seg = eq.filter(function (p) { return p.d >= s.start && p.d <= s.end; }), m = metrics(seg);
      return { id: s.id, name: s.name, covered: true, total: m ? m.total : NaN, mdd: m ? m.mdd.mdd : NaN, start: s.start, end: s.end };
    });
  }

  function toCSV(rows, cols) {
    var head = cols.map(function (c) { return c.label; }).join(',');
    return head + '\n' + rows.map(function (r) { return cols.map(function (c) { var v = typeof c.get === 'function' ? c.get(r) : r[c.key]; v = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
  }

  return { validate: validate, slice: slice, commonRange: commonRange, sma: sma, ema: ema, rsi: rsi, macd: macd,
    STRATEGIES: STRATEGIES, validateParams: validateParams, signals: signals, COST_PRESETS: COST_PRESETS, buyCost: buyCost, sellCost: sellCost,
    simulate: simulate, dca: dca, dcaDates: dcaDates, portfolio: portfolio, metrics: metrics, maxDrawdown: maxDrawdown, underwater: underwater,
    returns: returns, rolling: rolling, rollingVol: rollingVol, tradeStats: tradeStats, xirr: xirr, correlationMatrix: correlationMatrix,
    gridSearch: gridSearch, walkForward: walkForward, costSensitivity: costSensitivity, bootstrap: bootstrap, scenarios: scenarios, SCENARIOS: SCENARIOS, toCSV: toCSV, years: years };
});
