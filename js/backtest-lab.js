/* 台股入門 60 天 — 回測頁「進階模式」：在瀏覽器裡用 js/backtest-engine.js 真的重新計算。
   資料來自 data/backtest/bars.js（window.BACKTEST_BARS），每一個數字都能由「資料版本＋參數＋成本」重現。 */
(function () {
  'use strict';
  var E = window.BacktestEngine, D = window.BACKTEST_BARS;
  function el(id) { return document.getElementById(id); }
  function node(tag, attrs, parent) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') n.textContent = attrs[k]; else if (k === 'html') n.innerHTML = attrs[k]; else n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n); return n;
  }
  function svgNode(tag, attrs, parent) { var n = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); }); if (parent) parent.appendChild(n); return n; }
  var fin = function (x) { return x !== null && x !== undefined && isFinite(x); };
  function pct(x, d) { return fin(x) ? (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(d === undefined ? 1 : d) + '%' : '—'; }
  function pctAbs(x, d) { return fin(x) ? (x * 100).toFixed(d === undefined ? 1 : d) + '%' : '—'; }
  function num(x, d) { return fin(x) ? Number(x).toFixed(d === undefined ? 2 : d) : '—'; }
  function money(x, cur) { return fin(x) ? (cur === 'TWD' ? 'NT$' : cur === 'USD' ? 'US$' : '') + Math.round(x).toLocaleString('zh-Hant-TW') : '—'; }
  var upIsRed = true; // 台股慣例；美股可切換
  function cls(x) { if (!fin(x) || x === 0) return ''; return (x > 0) === upIsRed ? 'bt-pos' : 'bt-neg'; }
  function cell(tr, text, extra, head) { var c = node(head ? 'th' : 'td', { text: text }, tr); if (extra) c.className = extra; return c; }
  function table(container, head, rows, opts) {
    container.innerHTML = '';
    var t = node('table', { class: 'tool-table wide' }, container), hd = node('tr', {}, node('thead', {}, t));
    head.forEach(function (h, i) { var c = cell(hd, h, i && (!opts || !opts.textCols || opts.textCols.indexOf(i) < 0) ? 'num' : '', true); if (opts && opts.sortable) { c.tabIndex = 0; c.setAttribute('role', 'button'); c.title = '點一下排序'; c.addEventListener('click', function () { opts.sortable(i); }); c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.sortable(i); } }); } });
    var tb = node('tbody', {}, t);
    rows.forEach(function (r) { var tr = node('tr', {}, tb); r.forEach(function (c, i) { var v = Array.isArray(c) ? c : [c, '']; var td = cell(tr, v[0], (i && (!opts || !opts.textCols || opts.textCols.indexOf(i) < 0) ? 'num ' : '') + v[1], i === 0); if (i === 0) td.scope = 'row'; }); });
    return t;
  }

  // ---------- 折線圖：hover 游標、tooltip、圖例可開關、線性／對數 ----------
  function lineChart(container, series, opts) {
    opts = opts || {}; container.innerHTML = '';
    var hidden = container._hidden || {}; container._hidden = hidden;
    var legend = node('div', { class: 'bt-legend' }, container);
    series.forEach(function (s) {
      var b = node('button', { type: 'button', class: 'bt-key' + (hidden[s.name] ? ' is-off' : ''), 'aria-pressed': hidden[s.name] ? 'false' : 'true' }, legend);
      node('i', { style: 'background:' + s.color }, b); b.appendChild(document.createTextNode(s.name));
      b.addEventListener('click', function () { hidden[s.name] = !hidden[s.name]; lineChart(container, series, opts); });
    });
    var vis = series.filter(function (s) { return !hidden[s.name] && s.points.length; });
    var wrap = node('div', { class: 'bt-chart', role: 'img', 'aria-label': opts.label || '折線圖' }, container);
    if (!vis.length) { node('p', { class: 'tool-hint', text: '圖例全部關掉了。' }, wrap); return; }
    var W = Math.max(320, wrap.clientWidth || 640), H = opts.height || 280, padL = 56, padR = 12, padT = 12, padB = 28, log = !!opts.log;
    var all = []; vis.forEach(function (s) { s.points.forEach(function (p) { if (fin(p[1]) && (!log || p[1] > 0)) all.push(p[1]); }); });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (opts.zeroBase && lo > 0) lo = 0;
    if (log) { lo = Math.log(lo); hi = Math.log(hi); }
    if (hi === lo) { hi += 1; lo -= 1; }
    var pad = (hi - lo) * 0.05; lo -= pad; hi += pad;
    var t0 = Infinity, t1 = -Infinity; vis.forEach(function (s) { s.points.forEach(function (p) { var t = Date.parse(p[0]); if (t < t0) t0 = t; if (t > t1) t1 = t; }); });
    function X(t) { return padL + (t - t0) / Math.max(1, t1 - t0) * (W - padL - padR); }
    function Y(v) { var y = log ? Math.log(v) : v; return padT + (hi - y) / (hi - lo) * (H - padT - padB); }
    var svg = svgNode('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, class: 'bt-svg' }, wrap);
    // 漂亮的刻度
    var span = hi - lo, raw = span / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map(function (k) { return k * mag; }).filter(function (k) { return k >= raw; })[0];
    if (log) { step = span / 4; }
    for (var yv = Math.ceil(lo / step) * step; yv <= hi; yv += step) {
      var y = padT + (hi - yv) / (hi - lo) * (H - padT - padB), v = log ? Math.exp(yv) : yv;
      svgNode('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: 'bt-grid' }, svg);
      svgNode('text', { x: padL - 6, y: y + 4, class: 'bt-axis', 'text-anchor': 'end' }, svg).textContent = opts.fmt ? opts.fmt(v) : num(v);
    }
    var y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear(), ys = y1 - y0, ystep = ys > 20 ? 5 : ys > 8 ? 2 : 1;
    if (ys >= 1) for (var yy = y0 + 1; yy <= y1; yy++) { if ((yy - y0) % ystep) continue; var x = X(Date.parse(yy + '-01-01')); if (x < padL || x > W - padR) continue; svgNode('line', { x1: x, x2: x, y1: padT, y2: H - padB, class: 'bt-grid' }, svg); svgNode('text', { x: x, y: H - 8, class: 'bt-axis', 'text-anchor': 'middle' }, svg).textContent = yy; }
    else { var mAll = vis[0].points.map(function (p) { return p[0].slice(0, 7); }).filter(function (m, i, a) { return a.indexOf(m) === i; }); mAll.forEach(function (m, i) { if (i % Math.ceil(mAll.length / 6) !== 0) return; var x = X(Date.parse(m + '-01')); if (x < padL) return; svgNode('text', { x: x, y: H - 8, class: 'bt-axis', 'text-anchor': 'middle' }, svg).textContent = m; }); }
    if (fin(opts.baseline)) { var bv = log ? Math.log(opts.baseline) : opts.baseline; if (bv > lo && bv < hi) svgNode('line', { x1: padL, x2: W - padR, y1: Y(opts.baseline), y2: Y(opts.baseline), class: 'bt-base' }, svg); }
    vis.forEach(function (s) {
      var d = ''; s.points.forEach(function (p) { if (!fin(p[1]) || (log && !(p[1] > 0))) return; d += (d ? 'L' : 'M') + X(Date.parse(p[0])).toFixed(1) + ' ' + Y(p[1]).toFixed(1); });
      if (s.area) svgNode('path', { d: d + 'L' + X(Date.parse(s.points[s.points.length - 1][0])).toFixed(1) + ' ' + Y(opts.areaBase || 0) + 'L' + X(Date.parse(s.points[0][0])).toFixed(1) + ' ' + Y(opts.areaBase || 0) + 'Z', fill: s.color, opacity: 0.15 }, svg);
      svgNode('path', { d: d, fill: 'none', stroke: s.color, 'stroke-width': s.width || 1.75, 'stroke-linejoin': 'round' }, svg);
    });
    // 游標與 tooltip
    var cursor = svgNode('line', { x1: 0, x2: 0, y1: padT, y2: H - padB, class: 'bt-cursor', visibility: 'hidden' }, svg);
    var tip = node('div', { class: 'bt-tip', hidden: '' }, wrap);
    function nearest(s, t) { var lo2 = 0, hi2 = s.points.length - 1; while (lo2 < hi2) { var mid = (lo2 + hi2) >> 1; if (Date.parse(s.points[mid][0]) < t) lo2 = mid + 1; else hi2 = mid; } return s.points[lo2]; }
    function show(clientX) {
      var r = svg.getBoundingClientRect(), x = (clientX - r.left) * (W / r.width); if (x < padL || x > W - padR) { hide(); return; }
      var t = t0 + (x - padL) / (W - padL - padR) * (t1 - t0), p0 = nearest(vis[0], t), xx = X(Date.parse(p0[0]));
      cursor.setAttribute('x1', xx); cursor.setAttribute('x2', xx); cursor.setAttribute('visibility', 'visible');
      tip.innerHTML = '<b>' + p0[0] + '</b>' + vis.map(function (s) { var p = nearest(s, t); return '<br><i style="background:' + s.color + '"></i>' + s.name + '：' + (opts.tipFmt ? opts.tipFmt(p[1], s) : num(p[1], 4)); }).join('');
      tip.hidden = false; var left = (xx / W) * r.width; tip.style.left = Math.min(left + 12, r.width - tip.offsetWidth - 4) + 'px';
    }
    function hide() { cursor.setAttribute('visibility', 'hidden'); tip.hidden = true; }
    wrap.addEventListener('pointermove', function (e) { show(e.clientX); }); wrap.addEventListener('pointerleave', hide);
    wrap.addEventListener('pointerdown', function (e) { show(e.clientX); });
  }
  function heatTable(container, rowLabels, colLabels, cellFn) {
    container.innerHTML = '';
    var t = node('table', { class: 'tool-table wide bt-heat' }, container), hd = node('tr', {}, node('thead', {}, t)); cell(hd, '', '', true); colLabels.forEach(function (c) { cell(hd, c, 'num', true); });
    var tb = node('tbody', {}, t);
    rowLabels.forEach(function (r, i) { var tr = node('tr', {}, tb); cell(tr, r, '', true).scope = 'row'; colLabels.forEach(function (c, j) { var v = cellFn(i, j); var td = cell(tr, v === null || v === undefined || !fin(v) ? '' : pct(v), 'num ' + cls(v)); if (fin(v)) { var a = Math.min(1, Math.abs(v) / (opts_heat_scale || 0.1)); td.style.background = (v > 0) === upIsRed ? 'rgba(196,43,47,' + (a * 0.35).toFixed(2) + ')' : 'rgba(29,122,75,' + (a * 0.35).toFixed(2) + ')'; } }); });
  }
  var opts_heat_scale = 0.1;

  // ---------- 狀態 ----------
  if (!E || !D) { var err = el('lab-error'); if (err) { err.hidden = false; err.textContent = '進階模式需要 js/backtest-engine.js 和 data/backtest/bars.js，目前沒有載入。'; } return; }
  var SYMS = D.order.map(function (id) { var s = D.symbols[id]; s.data = s.rows.map(function (r) { return { d: r[0], o: r[1], h: r[2], l: r[3], c: r[4], v: r[5] }; }); s.validation = E.validate(s.data); return s; });
  var byId = {}; SYMS.forEach(function (s) { byId[s.id] = s; });
  var STORE_KEY = 'bt-lab-settings-v1';
  var state = { log: false, sortCol: 1, sortDir: -1, tradeFilter: '' };

  // ---------- 資料面板 ----------
  function renderData() {
    var c = el('lab-data');
    var rows = SYMS.map(function (s) {
      var q = s.quality.issues.length ? s.quality.issues.length + ' 項提醒' : '無';
      return [s.name + '（' + s.id.replace('.TW', '') + '）', [s.currency, ''], [s.first + '～' + s.last, ''], [String(s.bars), ''], [s.adjusted ? '含息還原' : '未還原、不含息', s.adjusted ? '' : 'bt-warn'], [s.source, ''], [s.fetched ? s.fetched.slice(0, 16).replace('T', ' ') : '—', ''], [q, s.quality.issues.length ? 'bt-warn' : '']];
    });
    D.missing.forEach(function (m) { rows.push([m.name + '（' + m.id.replace('.TW', '') + '）', [m.currency, ''], ['資料不足', 'bt-warn'], ['0', ''], ['—', ''], [m.reason, 'note-cell'], ['—', ''], ['—', '']]); });
    table(c, ['標的', '幣別', '可用區間', '日 K 數', '還原方式', '來源', '更新時間', '品質'], rows, { textCols: [1, 2, 4, 5, 6, 7] });
    var det = el('lab-data-issues'); det.innerHTML = '';
    SYMS.forEach(function (s) { if (!s.quality.issues.length) return; var p = node('p', { class: 'tool-hint' }, det); p.textContent = s.id + '：' + s.quality.issues.join('；'); });
    el('lab-data-version').textContent = '資料版本 ' + D.generated + '。';
  }

  // ---------- 設定表單 ----------
  function buildForm() {
    var list = el('lab-syms'); list.innerHTML = '';
    SYMS.forEach(function (s, i) {
      var l = node('label', { class: 'lab-sym' }, list), inp = node('input', { type: 'checkbox', value: s.id, id: 'lab-sym-' + i }, l);
      if (i === 0) inp.checked = true;
      l.appendChild(document.createTextNode(' ' + s.id.replace('.TW', '') + ' ' + s.name + '（' + s.currency + '，' + s.first.slice(0, 4) + '～' + s.last.slice(0, 7) + (s.adjusted ? '' : '，不含息') + '）'));
      inp.addEventListener('change', syncWeights);
    });
    D.missing.forEach(function (m) { var l = node('label', { class: 'lab-sym is-missing' }, list); var inp = node('input', { type: 'checkbox', disabled: '' }, l); l.appendChild(document.createTextNode(' ' + m.id.replace('.TW', '') + ' ' + m.name + '（資料不足）')); l.title = m.reason; });
    el('lab-sym-search').addEventListener('input', function () { var q = this.value.trim().toLowerCase(); list.querySelectorAll('label').forEach(function (l) { l.hidden = q && l.textContent.toLowerCase().indexOf(q) < 0; }); });
    var sel = el('lab-strategy'); Object.keys(E.STRATEGIES).forEach(function (k) { node('option', { value: k, text: E.STRATEGIES[k].name }, sel); }); sel.value = 'sma_cross';
    sel.addEventListener('change', renderParams); renderParams();
    var cs = el('lab-cost-preset'); Object.keys(E.COST_PRESETS).forEach(function (k) { node('option', { value: k, text: E.COST_PRESETS[k].label }, cs); }); cs.value = 'us';
    cs.addEventListener('change', function () { applyPreset(cs.value); }); applyPreset('us');
    var ext = E.commonRange(SYMS.map(function (s) { return s.data; })) || { start: SYMS[0].first, end: SYMS[0].last };
    el('lab-start').value = SYMS[0].first; el('lab-end').value = SYMS[0].last; el('lab-start').min = SYMS.reduce(function (a, s) { return s.first < a ? s.first : a; }, '9999'); el('lab-end').max = SYMS.reduce(function (a, s) { return s.last > a ? s.last : a; }, '0000');
    syncWeights();
    el('lab-run').addEventListener('click', run);
    el('lab-reset').addEventListener('click', function () { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* 忽略 */ } location.hash = 'lab'; location.reload(); });
    el('lab-save').addEventListener('click', function () { try { localStorage.setItem(STORE_KEY, JSON.stringify(readForm())); status('設定已存在這台裝置的瀏覽器。'); } catch (e) { status('瀏覽器不允許儲存設定。', true); } });
    el('lab-export').addEventListener('click', exportReport);
    el('lab-scale').addEventListener('change', function () { state.log = el('lab-scale').value === 'log'; if (state.last) renderResults(state.last); });
    el('lab-colors').addEventListener('change', function () { upIsRed = el('lab-colors').value === 'tw'; if (state.last) renderResults(state.last); });
    el('lab-mode').addEventListener('change', function () { document.body.classList.toggle('lab-advanced', el('lab-mode').value === 'advanced'); });
    try { var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); if (saved) { writeForm(saved); status('已載入上次儲存的設定。'); } } catch (e) { /* 忽略 */ }
  }
  function renderParams() {
    var k = el('lab-strategy').value, box = el('lab-params'); box.innerHTML = '';
    E.STRATEGIES[k].params.forEach(function (p) { var l = node('label', { class: 'field', text: p.label }, box); node('input', { type: 'number', id: 'lab-p-' + p.k, value: p.def, min: p.min, max: p.max, step: 1, inputmode: 'numeric' }, l); });
    if (!E.STRATEGIES[k].params.length) node('p', { class: 'tool-hint', text: '買進持有沒有參數：第一天開盤買進，抱到最後。' }, box);
  }
  function applyPreset(k) { var c = E.COST_PRESETS[k]; ['feeRate', 'feeDiscount', 'minFee', 'taxRate', 'commission', 'minCommission', 'slipBps'].forEach(function (f) { el('lab-c-' + f).value = f === 'feeRate' || f === 'taxRate' ? c[f] * 100 : c[f]; }); }
  function selectedIds() { return Array.prototype.map.call(el('lab-syms').querySelectorAll('input:checked'), function (i) { return i.value; }); }
  function syncWeights() {
    var ids = selectedIds(), box = el('lab-weights'); box.innerHTML = '';
    if (ids.length < 2) { node('p', { class: 'tool-hint', text: '勾兩檔以上才能組投資組合。' }, box); return; }
    var each = Math.floor(100 / ids.length);
    ids.forEach(function (id, i) { var l = node('label', { class: 'field', text: id.replace('.TW', '') + ' 權重（%）' }, box); node('input', { type: 'number', id: 'lab-w-' + id, value: i === ids.length - 1 ? 100 - each * (ids.length - 1) : each, min: 0, max: 100, step: 1, 'data-id': id }, l); });
  }
  function readForm() {
    var p = {}; E.STRATEGIES[el('lab-strategy').value].params.forEach(function (q) { p[q.k] = +el('lab-p-' + q.k).value; });
    var w = {}; el('lab-weights').querySelectorAll('input').forEach(function (i) { w[i.getAttribute('data-id')] = +i.value; });
    return {
      ids: selectedIds(), start: el('lab-start').value, end: el('lab-end').value, period: el('lab-period').value, cash0: +el('lab-cash0').value,
      strategy: el('lab-strategy').value, params: p, stopLoss: +el('lab-stop').value / 100, takeProfit: +el('lab-take').value / 100,
      costPreset: el('lab-cost-preset').value, cost: { feeRate: +el('lab-c-feeRate').value / 100, feeDiscount: +el('lab-c-feeDiscount').value, minFee: +el('lab-c-minFee').value, taxRate: +el('lab-c-taxRate').value / 100, commission: +el('lab-c-commission').value, minCommission: +el('lab-c-minCommission').value, slipBps: +el('lab-c-slipBps').value, lot: 1 },
      cashRate: +el('lab-cashrate').value / 100, fractional: el('lab-fractional').checked, closeOut: el('lab-closeout').checked,
      dca: { amount: +el('lab-dca-amount').value, day: +el('lab-dca-day').value, freq: el('lab-dca-freq').value, variant: el('lab-dca-variant').value, dipPct: +el('lab-dca-dip').value / 100, dipMult: +el('lab-dca-mult').value, tranches: +el('lab-dca-tranches').value },
      weights: w, cashWeight: +el('lab-cashw').value / 100, rebalance: el('lab-rebalance').value, threshold: +el('lab-threshold').value / 100,
      adv: { split: +el('lab-split').value / 100, fastFrom: +el('lab-g-fast-from').value, fastTo: +el('lab-g-fast-to').value, fastStep: +el('lab-g-fast-step').value, slowFrom: +el('lab-g-slow-from').value, slowTo: +el('lab-g-slow-to').value, slowStep: +el('lab-g-slow-step').value, wfTrain: +el('lab-wf-train').value, wfTest: +el('lab-wf-test').value, paths: +el('lab-mc-paths').value, horizon: +el('lab-mc-h').value }
    };
  }
  function writeForm(s) {
    try {
      el('lab-syms').querySelectorAll('input').forEach(function (i) { i.checked = s.ids.indexOf(i.value) >= 0; });
      el('lab-start').value = s.start; el('lab-end').value = s.end; el('lab-period').value = s.period; el('lab-cash0').value = s.cash0;
      el('lab-strategy').value = s.strategy; renderParams(); Object.keys(s.params).forEach(function (k) { if (el('lab-p-' + k)) el('lab-p-' + k).value = s.params[k]; });
      el('lab-stop').value = s.stopLoss * 100; el('lab-take').value = s.takeProfit * 100; el('lab-cost-preset').value = s.costPreset;
      el('lab-c-feeRate').value = s.cost.feeRate * 100; el('lab-c-feeDiscount').value = s.cost.feeDiscount; el('lab-c-minFee').value = s.cost.minFee; el('lab-c-taxRate').value = s.cost.taxRate * 100; el('lab-c-commission').value = s.cost.commission; el('lab-c-minCommission').value = s.cost.minCommission; el('lab-c-slipBps').value = s.cost.slipBps;
      el('lab-cashrate').value = s.cashRate * 100; el('lab-fractional').checked = s.fractional; el('lab-closeout').checked = s.closeOut;
      el('lab-dca-amount').value = s.dca.amount; el('lab-dca-day').value = s.dca.day; el('lab-dca-freq').value = s.dca.freq; el('lab-dca-variant').value = s.dca.variant; el('lab-dca-dip').value = s.dca.dipPct * 100; el('lab-dca-mult').value = s.dca.dipMult; el('lab-dca-tranches').value = s.dca.tranches;
      syncWeights(); Object.keys(s.weights).forEach(function (k) { if (el('lab-w-' + k)) el('lab-w-' + k).value = s.weights[k]; }); el('lab-cashw').value = s.cashWeight * 100; el('lab-rebalance').value = s.rebalance; el('lab-threshold').value = s.threshold * 100;
    } catch (e) { /* 舊格式就算了 */ }
  }
  function status(msg, bad) { var s = el('lab-status'); s.textContent = msg; s.className = 'tool-msg' + (bad ? ' is-bad' : ''); }

  // ---------- 執行 ----------
  function run() {
    var cfg = readForm(), errs = [];
    if (!cfg.ids.length) errs.push('至少勾一檔標的。');
    if (!(cfg.cash0 > 0)) errs.push('初始資金要大於 0。');
    if (cfg.start >= cfg.end) errs.push('開始日期要早於結束日期。');
    errs = errs.concat(E.validateParams(cfg.strategy, cfg.params));
    var curs = cfg.ids.map(function (id) { return byId[id].currency; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
    if (errs.length) { status('沒有執行：' + errs.join(' '), true); return; }
    status('計算中…'); el('lab-run').disabled = true;
    setTimeout(function () {
      try {
        var out = compute(cfg, curs);
        state.last = out; renderResults(out);
        status('完成：' + out.symbols.length + ' 檔、' + out.symbols.reduce(function (a, s) { return a + s.sim.equity.length; }, 0) + ' 個交易日，' + new Date().toLocaleTimeString('zh-Hant-TW') + ' 算完。');
        el('lab-results').hidden = false;
      } catch (e) { status('計算失敗：' + e.message, true); console.error(e); }
      el('lab-run').disabled = false;
    }, 20);
  }
  function compute(cfg, curs) {
    var range = cfg.period === 'common' ? E.commonRange(cfg.ids.map(function (id) { return byId[id].data; })) : null;
    var start = range && range.start > cfg.start ? range.start : cfg.start, end = range && range.end < cfg.end ? range.end : cfg.end;
    var simOpts = { cash0: cfg.cash0, cost: cfg.cost, fractional: cfg.fractional, cashRate: cfg.cashRate, stopLoss: cfg.stopLoss, takeProfit: cfg.takeProfit, closeOut: cfg.closeOut };
    var symbols = cfg.ids.map(function (id) {
      var s = byId[id];
      // 均線要暖機：把區間前面的資料一起餵進去，但績效只從使用者選的開始日起算
      var full = E.slice(s.data, null, end), fromIdx = full.findIndex(function (b) { return b.d >= start; });
      if (fromIdx < 0) return { id: id, meta: s, error: '這段期間沒有資料' };
      var sig = E.signals(full, cfg.strategy, cfg.params), warmNeeded = sig.warmup;
      var cut = Math.max(0, fromIdx - 0), bars = full.slice(Math.min(cut, Math.max(0, fromIdx)));
      // 暖機不夠就往前借資料；借不到就從有訊號的那天開始並標註
      var useBars = full.slice(Math.max(0, fromIdx - warmNeeded));
      var sig2 = E.signals(useBars, cfg.strategy, cfg.params);
      var sim = E.simulate(useBars, sig2, simOpts);
      sim.equity = sim.equity.filter(function (p) { return p.d >= start; });
      var warmNote = sim.equity.length && sim.equity[0].d > start ? '均線暖機需要 ' + warmNeeded + ' 根，所以績效從 ' + sim.equity[0].d + ' 開始算' : '';
      // 買進持有的比較基準和策略用同一段（暖機結束那天起），不同區間不能直接比
      var bhStart = sim.equity.length ? sim.equity[0].d : start, bhIdx = full.findIndex(function (b) { return b.d >= bhStart; });
      var bh = E.simulate(full.slice(bhIdx), E.signals(full.slice(bhIdx), 'buy_hold'), { cash0: cfg.cash0, cost: cfg.cost, fractional: cfg.fractional });
      var dcaBars = full.slice(fromIdx), dcaRes = {};
      ['fixed', 'dip', 'tranche'].forEach(function (v) { dcaRes[v] = E.dca(dcaBars, { amount: cfg.dca.amount, day: cfg.dca.day, freq: cfg.dca.freq, variant: v, dipPct: cfg.dca.dipPct, dipMult: cfg.dca.dipMult, tranches: cfg.dca.tranches, cost: cfg.cost, fractional: cfg.fractional, cashRate: cfg.cashRate }); });
      var m = sim.equity.length > 2 ? E.metrics(sim.equity) : null;
      return { id: id, meta: s, bars: dcaBars, sim: sim, metrics: m, trades: E.tradeStats(sim.trades), bh: bh, bhMetrics: E.metrics(bh.equity), dca: dcaRes, warmNote: warmNote, scenarios: E.scenarios(bh.equity), underwater: E.underwater(sim.equity), rollingVol: sim.equity.length > 70 ? E.rollingVol(sim.equity, 60) : [] };
    });
    var valid = symbols.filter(function (s) { return !s.error; });
    var port = null;
    if (valid.length >= 2) {
      if (curs.length > 1) port = { error: '選到的標的幣別不同（' + curs.join('、') + '），這個版本沒有匯率資料，無法組成同幣別的投資組合。' };
      else {
        var wsum = valid.reduce(function (a, s) { return a + (cfg.weights[s.id] || 0); }, 0) + cfg.cashWeight * 100;
        if (Math.abs(wsum - 100) > 0.01) port = { error: '權重加總要等於 100%，現在是 ' + wsum.toFixed(1) + '%。' };
        else port = E.portfolio(valid.map(function (s) { return { id: s.id, bars: s.bars, weight: (cfg.weights[s.id] || 0) / 100, cost: cfg.cost }; }), { cash0: cfg.cash0, cashWeight: cfg.cashWeight, rebalance: cfg.rebalance, threshold: cfg.threshold, fractional: cfg.fractional, cashRate: cfg.cashRate });
        if (!port.error) port.metrics = E.metrics(port.equity);
      }
    }
    // 進階：用第一檔做參數敏感度、walk-forward、成本敏感度、bootstrap
    var adv = null, f = valid[0];
    if (f && cfg.strategy === 'sma_cross') {
      var grid = []; for (var a = cfg.adv.fastFrom; a <= cfg.adv.fastTo; a += cfg.adv.fastStep) for (var b = cfg.adv.slowFrom; b <= cfg.adv.slowTo; b += cfg.adv.slowStep) if (a < b) grid.push({ fast: a, slow: b });
      var splitIdx = Math.floor(f.bars.length * cfg.adv.split), splitDate = f.bars[Math.min(splitIdx, f.bars.length - 1)].d;
      adv = { grid: grid, gridRes: E.gridSearch(f.bars, 'sma_cross', grid, simOpts, splitDate), splitDate: splitDate,
        wf: E.walkForward(f.bars, 'sma_cross', grid, simOpts, { trainYears: cfg.adv.wfTrain, testMonths: cfg.adv.wfTest }) };
    }
    if (f) { adv = adv || {}; adv.costSens = E.costSensitivity(f.bars, cfg.strategy, cfg.params, simOpts, [0, 0.5, 1, 2, 4]); adv.boot = f.sim.equity.length > 60 ? E.bootstrap(f.sim.equity, { paths: cfg.adv.paths, horizonDays: cfg.adv.horizon, block: 10, seed: 42 }) : null; }
    return { cfg: cfg, start: start, end: end, currency: curs.join('/'), symbols: valid, errors: symbols.filter(function (s) { return s.error; }), portfolio: port, adv: adv, computedAt: new Date().toISOString() };
  }

  // ---------- 畫結果 ----------
  var COLORS = ['var(--ink)', 'var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--green)', 'var(--red)'];
  function renderResults(out) {
    var cfg = out.cfg, cur = out.currency;
    // 摘要
    el('lab-sum').innerHTML = '';
    var sum = [['資料版本', D.generated], ['回測區間', out.start + '～' + out.end + (cfg.period === 'common' ? '（共同交集）' : '（各自可用區間內）')], ['幣別', cur],
      ['含息／不含息', out.symbols.map(function (s) { return s.id + '：' + (s.meta.adjusted ? '含息還原' : '不含息'); }).join('；')],
      ['策略', E.STRATEGIES[cfg.strategy].name + ' ' + JSON.stringify(cfg.params) + (cfg.stopLoss ? '，停損 ' + pctAbs(cfg.stopLoss, 0) : '') + (cfg.takeProfit ? '，停利 ' + pctAbs(cfg.takeProfit, 0) : '')],
      ['成交規則', '收盤出訊號，隔天開盤成交；' + (cfg.fractional ? '允許碎股' : '整股') + '；滑價 ' + cfg.cost.slipBps + ' bps'],
      ['成本假設', '手續費 ' + (cfg.cost.feeRate * 100).toFixed(4) + '%×' + cfg.cost.feeDiscount + '（最低 ' + cfg.cost.minFee + '）、交易稅 ' + (cfg.cost.taxRate * 100).toFixed(2) + '%、每筆佣金 ' + cfg.cost.commission + '（最低 ' + cfg.cost.minCommission + '）、閒置現金年利率 ' + (cfg.cashRate * 100).toFixed(2) + '%'],
      ['樣本數', out.symbols.map(function (s) { return s.id + ' ' + s.sim.equity.length + ' 個交易日'; }).join('；')]];
    var st = node('table', { class: 'tool-table' }, el('lab-sum')), tb = node('tbody', {}, st);
    sum.forEach(function (r) { var tr = node('tr', {}, tb); cell(tr, r[0], '', true).scope = 'row'; cell(tr, r[1], 'note-cell'); });
    out.errors.forEach(function (e) { node('p', { class: 'tool-error', text: e.id + '：' + e.error }, el('lab-sum')); });
    out.symbols.forEach(function (s) { if (s.warmNote) node('p', { class: 'tool-hint', text: s.id + '：' + s.warmNote }, el('lab-sum')); if (!s.meta.adjusted) node('p', { class: 'tool-hint', text: s.id + '：這筆資料不含配息，報酬會低估含息總報酬。' }, el('lab-sum')); });
    // KPI
    var kpiRows = ['累積報酬', '年化報酬', '最大回撤', '回撤期間', '回本天數', '年化波動', 'Sharpe', 'Sortino', 'Calmar', '交易次數', '勝率', '曝險率', '換手率', '總交易成本', '95% 日 VaR'];
    var kpiHead = ['指標'].concat(out.symbols.map(function (s) { return s.id.replace('.TW', '') + ' 策略'; })).concat(out.symbols.map(function (s) { return s.id.replace('.TW', '') + ' 買進持有（同期 ' + s.bh.equity[0].d + ' 起）'; }));
    function kpi(s, m, sim, tr, label) {
      if (!m) return ['—'];
      return [[pct(m.total), cls(m.total)], [pct(m.cagr), cls(m.cagr)], [pct(m.mdd.mdd), cls(m.mdd.mdd)], [m.mdd.peak ? m.mdd.peak + '→' + m.mdd.trough + '（' + m.mdd.days + ' 天）' : '—', ''], [m.mdd.recoveryDays === null ? (m.mdd.mdd < 0 ? '還沒回本' : '—') : m.mdd.recoveryDays + ' 天', ''], [pctAbs(m.vol), ''], [num(m.sharpe), ''], [num(m.sortino), ''], [num(m.calmar), ''], [String(sim.trades.length), ''], [fin(tr.winRate) ? pctAbs(tr.winRate, 0) : '—', ''], [pctAbs(sim.exposure, 0), ''], [num(sim.turnover, 2) + '×', ''], [money(sim.costs.total, s.meta.currency), ''], [pct(m.var95, 2), cls(m.var95)]];
    }
    var cols = out.symbols.map(function (s) { return kpi(s, s.metrics, s.sim, s.trades); }).concat(out.symbols.map(function (s) { return kpi(s, s.bhMetrics, s.bh, E.tradeStats(s.bh.trades)); }));
    table(el('lab-kpi'), kpiHead, kpiRows.map(function (r, i) { return [r].concat(cols.map(function (c) { return c[i] || '—'; })); }), { textCols: [] });
    // 權益曲線（起始 1）
    var series = [];
    out.symbols.forEach(function (s, i) { series.push({ name: s.id.replace('.TW', '') + ' 策略', color: COLORS[i % COLORS.length], width: 2.25, points: s.sim.equity.map(function (p) { return [p.d, p.v / cfg.cash0]; }) }); series.push({ name: s.id.replace('.TW', '') + ' 買進持有', color: COLORS[i % COLORS.length], width: 1, points: s.bh.equity.map(function (p) { return [p.d, p.v / cfg.cash0]; }) }); });
    if (out.portfolio && !out.portfolio.error) series.push({ name: '投資組合', color: 'var(--red)', width: 2.5, points: out.portfolio.equity.map(function (p) { return [p.d, p.v / cfg.cash0]; }) });
    lineChart(el('lab-equity'), series, { log: state.log, baseline: 1, label: '權益曲線', fmt: function (v) { return v >= 10 ? v.toFixed(0) : v.toFixed(2); }, tipFmt: function (v) { return v.toFixed(4) + '（' + pct(v - 1) + '）'; } });
    lineChart(el('lab-underwater'), out.symbols.map(function (s, i) { return { name: s.id.replace('.TW', ''), color: COLORS[i % COLORS.length], area: true, points: s.underwater.map(function (p) { return [p.d, p.v]; }) }; }), { label: '水下回撤曲線', height: 180, zeroBase: true, fmt: function (v) { return pctAbs(v, 0); }, tipFmt: function (v) { return pct(v); } });
    // 月度熱力圖（第一檔策略）
    var f = out.symbols[0];
    if (f && f.metrics) {
      var byY = {}; f.metrics.monthly.forEach(function (m) { var y = m.ym.slice(0, 4); (byY[y] = byY[y] || {})[+m.ym.slice(5, 7)] = m.r; });
      var yrs = Object.keys(byY); opts_heat_scale = 0.1;
      heatTable(el('lab-monthly'), yrs, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '全年'], function (i, j) { if (j === 12) return f.metrics.yearly[yrs[i]]; var v = byY[yrs[i]][j + 1]; return v === undefined ? null : v; });
      el('lab-monthly-title').textContent = f.id + ' 策略的月度報酬（熱力圖）';
      // 年度與滾動
      table(el('lab-yearly'), ['年'].concat(out.symbols.map(function (s) { return s.id.replace('.TW', '') + ' 策略'; })).concat(out.symbols.map(function (s) { return s.id.replace('.TW', '') + ' 買進持有'; })),
        Object.keys(f.metrics.yearly).map(function (y) { return [y].concat(out.symbols.map(function (s) { var v = s.metrics ? s.metrics.yearly[y] : NaN; return [pct(v), cls(v)]; })).concat(out.symbols.map(function (s) { var v = s.bhMetrics.yearly[y]; return [pct(v), cls(v)]; })); }));
      var rr = [];
      out.symbols.forEach(function (s) { s.bhMetrics.rolling.forEach(function (r) { rr.push(r.insufficient ? [s.id.replace('.TW', '') + ' 抱 ' + r.years + ' 年', ['資料不足（需要 ' + r.years + ' 年，只有 ' + num(r.have, 1) + ' 年）', 'bt-warn'], '', '', '', '', ''] : [s.id.replace('.TW', '') + ' 抱 ' + r.years + ' 年', [String(r.n), ''], [pct(r.min), cls(r.min)], [pct(r.p25), cls(r.p25)], [pct(r.median), cls(r.median)], [pct(r.max), cls(r.max)], [pctAbs(r.pctPositive, 0), '']]); }); });
      table(el('lab-rolling'), ['買進持有', '進場日數', '最差', '第 25 百分位', '中位數', '最好', '最後是賺的'], rr, { textCols: [1] });
    }
    renderTrades(out); renderDca(out); renderPortfolio(out); renderRisk(out); renderAdvanced(out);
  }
  function renderTrades(out) {
    var rows = []; out.symbols.forEach(function (s) { s.sim.trades.forEach(function (t) { rows.push(Object.assign({ id: s.id, cur: s.meta.currency }, t)); }); });
    state.allTrades = rows;
    var f = state.tradeFilter, shown = rows.filter(function (t) { return !f || t.id.indexOf(f) >= 0 || (t.reason || '').indexOf(f) >= 0; });
    var keys = ['id', 'signalDate', 'entryDate', 'entryPrice', 'qty', 'entryFee', 'exitSignal', 'exitDate', 'exitPrice', 'exitFee', 'tax', 'pnl', 'ret', 'days', 'reason'];
    shown.sort(function (a, b) { var k = keys[state.sortCol] || 'entryDate', x = a[k], y = b[k]; x = x === null || x === undefined ? '' : x; y = y === null || y === undefined ? '' : y; return (x > y ? 1 : x < y ? -1 : 0) * state.sortDir; });
    table(el('lab-trades'), ['標的', '訊號日', '成交日', '成交價', '數量', '買進費用', '出場訊號日', '出場日', '出場價', '賣出費用', '交易稅', '損益', '報酬', '持有天數', '原因'],
      shown.map(function (t) { return [t.id, [t.signalDate, ''], [t.entryDate, ''], [num(t.entryPrice), ''], [num(t.qty, out.cfg.fractional ? 4 : 0), ''], [num(t.entryFee), ''], [t.exitSignal || '—', ''], [t.exitDate || '持有中', ''], [num(t.exitPrice), ''], [num(t.exitFee), ''], [num(t.tax), ''], [num(t.pnl), cls(t.pnl)], [pct(t.ret), cls(t.ret)], [String(t.days), ''], [t.reason, '']]; }),
      { textCols: [1, 2, 6, 7, 14], sortable: function (i) { if (state.sortCol === i) state.sortDir *= -1; else { state.sortCol = i; state.sortDir = 1; } renderTrades(out); } });
    el('lab-trades-count').textContent = shown.length + ' 筆（共 ' + rows.length + ' 筆）。點欄名可以排序。';
  }
  function renderDca(out) {
    var c = el('lab-dca'); c.innerHTML = '';
    out.symbols.forEach(function (s, i) {
      var box = node('div', {}, c); node('h4', { class: 'tool-sub', text: s.id + '（' + s.meta.currency + '）：三種投入法，相同期間、相同成本' }, box);
      var variants = [['fixed', '固定金額'], ['dip', '逢跌加碼（開盤比近 ' + 60 + ' 日高點低 ' + pctAbs(out.cfg.dca.dipPct, 0) + ' 就投 ' + out.cfg.dca.dipMult + ' 倍）'], ['tranche', '分批投入（只投前 ' + out.cfg.dca.tranches + ' 期）']];
      table(node('div', { class: 'bt-scroll' }, box), ['投入法', '累計投入', '期末市值', '未實現損益', 'XIRR（資金加權）', 'TWR（時間加權）', 'TWR 最大回撤', '市值÷投入 最低', '買進次數', '手續費'],
        variants.map(function (v) { var r = s.dca[v[0]]; var twrTot = r.twr.length ? r.twr[r.twr.length - 1].v - 1 : NaN; return [v[1], [money(r.investedTotal, s.meta.currency), ''], [money(r.finalValue, s.meta.currency), ''], [money(r.unrealized, s.meta.currency), cls(r.unrealized)], [pct(r.xirr), cls(r.xirr)], [pct(twrTot), cls(twrTot)], [pct(r.twrMdd.mdd), cls(r.twrMdd.mdd)], [r.ratioMdd ? pct(r.ratioMdd.mdd) : '—', r.ratioMdd ? cls(r.ratioMdd.mdd) : ''], [String(r.buys.length), ''], [money(r.costs.fee, s.meta.currency), '']]; }), { textCols: [] });
      node('p', { class: 'tool-hint', text: '三種投入法的總投入資金和投入時間分布不同，所以不能只比期末市值；XIRR 把每一筆投入的時間都算進去，比較公平。「TWR 最大回撤」是真正的投資虧損；「市值÷投入 最低」會被持續投入稀釋，只當參考。' }, box);
      var ch = node('div', {}, box);
      lineChart(ch, [{ name: '固定金額 市值', color: COLORS[0], width: 2, points: s.dca.fixed.value.map(function (p) { return [p.d, p.v]; }) }, { name: '固定金額 累計投入', color: 'var(--ink-2)', width: 1, points: s.dca.fixed.invested.map(function (p) { return [p.d, p.v]; }) }, { name: '逢跌加碼 市值', color: COLORS[1], width: 1.5, points: s.dca.dip.value.map(function (p) { return [p.d, p.v]; }) }, { name: '分批投入 市值', color: COLORS[2], width: 1.5, points: s.dca.tranche.value.map(function (p) { return [p.d, p.v]; }) }],
        { label: '定期定額市值與投入', height: 220, zeroBase: true, fmt: function (v) { return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v.toFixed(0); }, tipFmt: function (v) { return money(v, s.meta.currency); } });
    });
  }
  function renderPortfolio(out) {
    var c = el('lab-port'); c.innerHTML = ''; var p = out.portfolio;
    if (!p) { node('p', { class: 'tool-hint', text: '勾兩檔以上同幣別的標的，就會算投資組合。' }, c); return; }
    if (p.error) { node('p', { class: 'tool-error', text: p.error }, c); return; }
    var m = p.metrics, ids = out.symbols.map(function (s) { return s.id; });
    table(node('div', { class: 'bt-scroll' }, c), ['投資組合', '值'], [['再平衡', [{ none: '不再平衡', M: '每月', Q: '每季', Y: '每年', T: '偏離超過 ' + pctAbs(out.cfg.threshold, 0) }[out.cfg.rebalance], '']], ['再平衡次數', [String(p.rebalances), '']], ['累積報酬', [pct(m.total), cls(m.total)]], ['年化報酬', [pct(m.cagr), cls(m.cagr)]], ['最大回撤', [pct(m.mdd.mdd), cls(m.mdd.mdd)]], ['年化波動', [pctAbs(m.vol), '']], ['Sharpe', [num(m.sharpe), '']], ['換手率', [num(p.turnover, 2) + '×', '']], ['總交易成本', [money(p.costs.total, out.currency), '']]], { textCols: [1] });
    node('h4', { class: 'tool-sub', text: '資產配置（目標權重）與風險貢獻' }, c);
    table(node('div', { class: 'bt-scroll' }, c), ['標的', '目標權重', '期末權重', '風險貢獻'], ids.map(function (id, i) { var last = p.equity[p.equity.length - 1]; return [id, [pctAbs(out.cfg.weights[id] / 100, 0), ''], [pctAbs(last.weights[i], 1), ''], [pctAbs(p.riskContribution[i], 1), '']]; }).concat([['現金', [pctAbs(out.cfg.cashWeight, 0), ''], [pctAbs(p.equity[p.equity.length - 1].cash, 1), ''], ['—', '']]]));
    node('h4', { class: 'tool-sub', text: '相關係數（日報酬，共同交易日）' }, c);
    table(node('div', { class: 'bt-scroll' }, c), [''].concat(ids), ids.map(function (id, i) { return [id].concat(ids.map(function (_, j) { return [num(p.correlation[i][j]), '']; })); }));
    var wch = node('div', {}, c);
    lineChart(wch, ids.map(function (id, i) { return { name: id + ' 實際權重', color: COLORS[i % COLORS.length], points: p.equity.map(function (q) { return [q.d, q.weights[i]]; }) }; }), { label: '權重漂移', height: 180, zeroBase: true, fmt: function (v) { return pctAbs(v, 0); }, tipFmt: function (v) { return pctAbs(v, 1); } });
  }
  function renderRisk(out) {
    var c = el('lab-risk'); c.innerHTML = '';
    var f = out.symbols[0]; if (!f || !f.metrics) return;
    lineChart(node('div', {}, c), out.symbols.filter(function (s) { return s.rollingVol.length; }).map(function (s, i) { return { name: s.id.replace('.TW', '') + ' 60 日年化波動', color: COLORS[i % COLORS.length], points: s.rollingVol.map(function (p) { return [p.d, p.v]; }) }; }), { label: '滾動波動度', height: 180, zeroBase: true, fmt: function (v) { return pctAbs(v, 0); }, tipFmt: function (v) { return pctAbs(v, 1); } });
    table(node('div', { class: 'bt-scroll' }, c), ['風險指標'].concat(out.symbols.map(function (s) { return s.id.replace('.TW', ''); })), [
      ['95% 日 VaR（歷史法）'].concat(out.symbols.map(function (s) { return [pct(s.metrics.var95, 2), cls(s.metrics.var95)]; })),
      ['95% 日 CVaR'].concat(out.symbols.map(function (s) { return [pct(s.metrics.cvar95, 2), cls(s.metrics.cvar95)]; })),
      ['最好的月份'].concat(out.symbols.map(function (s) { return [s.metrics.bestMonth.ym + ' ' + pct(s.metrics.bestMonth.r), cls(s.metrics.bestMonth.r)]; })),
      ['最差的月份'].concat(out.symbols.map(function (s) { return [s.metrics.worstMonth.ym + ' ' + pct(s.metrics.worstMonth.r), cls(s.metrics.worstMonth.r)]; }))], { textCols: [] });
    if (out.symbols.length > 1) {
      var common = E.commonRange(out.symbols.map(function (s) { return s.sim.equity.map(function (p) { return { d: p.d }; }); }));
      var rets = out.symbols.map(function (s) { return E.returns(s.sim.equity.filter(function (p) { return p.d >= common.start && p.d <= common.end; })); });
      var cm = E.correlationMatrix(rets), ids = out.symbols.map(function (s) { return s.id.replace('.TW', ''); });
      node('h4', { class: 'tool-sub', text: '策略權益的相關係數（' + common.start + '～' + common.end + '）' }, c);
      table(node('div', { class: 'bt-scroll' }, c), [''].concat(ids), ids.map(function (id, i) { return [id].concat(ids.map(function (_, j) { return [num(cm[i][j]), '']; })); }));
    }
  }
  function renderAdvanced(out) {
    var c = el('lab-adv'); c.innerHTML = ''; var a = out.adv, f = out.symbols[0];
    if (!a) { node('p', { class: 'tool-hint', text: '沒有可用的標的。' }, c); return; }
    node('h4', { class: 'tool-sub', text: '歷史情境壓力測試（' + f.id + ' 買進持有）' }, c);
    table(node('div', { class: 'bt-scroll' }, c), ['情境', '區間', '期間報酬', '期間最大回撤'], f.scenarios.map(function (s) { return s.covered ? [s.name, [s.start + '～' + s.end, ''], [pct(s.total), cls(s.total)], [pct(s.mdd), cls(s.mdd)]] : [s.name, ['資料未涵蓋這段期間', 'bt-warn'], '', '']; }), { textCols: [1] });
    if (a.gridRes) {
      node('h4', { class: 'tool-sub', text: '參數敏感度：訓練期（' + a.gridRes.trainRange[0] + '～' + a.gridRes.trainRange[1] + '）選參數，驗證期（' + a.gridRes.testRange[0] + '～' + a.gridRes.testRange[1] + '）另外看' }, c);
      var fasts = a.grid.map(function (g) { return g.fast; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; }), slows = a.grid.map(function (g) { return g.slow; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; });
      var lookup = {}; a.gridRes.rows.forEach(function (r) { lookup[r.params.fast + '/' + r.params.slow] = r; });
      ['train', 'test'].forEach(function (phase) {
        node('p', { class: 'tool-desc', text: (phase === 'train' ? '訓練期' : '驗證期') + '年化報酬：列是快線、欄是慢線' }, c);
        opts_heat_scale = 0.3;
        heatTable(node('div', { class: 'bt-scroll' }, c), fasts.map(String), slows.map(String), function (i, j) { var r = lookup[fasts[i] + '/' + slows[j]]; return r && r[phase] ? r[phase].cagr : null; });
      });
      var best = a.gridRes.rows.filter(function (r) { return r.train; }).sort(function (x, y) { return y.train.sharpe - x.train.sharpe; })[0];
      if (best) node('p', { class: 'tool-hint', text: '訓練期 Sharpe 最高的是 MA' + best.params.fast + '/' + best.params.slow + '（訓練期年化 ' + pct(best.train.cagr) + '）；同一組參數在驗證期年化 ' + (best.test ? pct(best.test.cagr) : '—') + '。兩者差很多就代表參數是「湊」出來的。' }, c);
      node('h4', { class: 'tool-sub', text: 'Walk-forward：每個視窗在訓練段選 Sharpe 最高的參數，拿到接下來的測試段跑' }, c);
      if (!a.wf.length) node('p', { class: 'tool-hint', text: '資料長度不夠切出訓練 ' + out.cfg.adv.wfTrain + ' 年＋測試 ' + out.cfg.adv.wfTest + ' 個月的視窗；調短視窗或等更長的歷史資料。' }, c);
      else table(node('div', { class: 'bt-scroll' }, c), ['訓練段', '測試段', '選到的參數', '訓練 Sharpe', '測試年化', '測試最大回撤', '同期買進持有年化'], a.wf.map(function (w) { return [w.train.join('～'), [w.test.join('～'), ''], ['MA' + w.params.fast + '/' + w.params.slow, ''], [num(w.trainSharpe), ''], [pct(w.testCagr), cls(w.testCagr)], [pct(w.testMdd), cls(w.testMdd)], [pct(w.bhCagr), cls(w.bhCagr)]]; }), { textCols: [1, 2] });
    } else node('p', { class: 'tool-hint', text: '參數敏感度和 walk-forward 目前只對「均線交叉」提供。' }, c);
    node('h4', { class: 'tool-sub', text: '交易成本敏感度（' + f.id + '）' }, c);
    table(node('div', { class: 'bt-scroll' }, c), ['成本倍數', '年化報酬', '累積報酬', '總成本'], a.costSens.map(function (r) { return [r.multiplier + '×', [pct(r.cagr), cls(r.cagr)], [pct(r.total), cls(r.total)], [money(r.costs, f.meta.currency), '']]; }));
    node('h4', { class: 'tool-sub', text: 'Bootstrap 模擬（統計模擬，不是真實歷史行情）' }, c);
    if (a.boot) { var b = a.boot; table(node('div', { class: 'bt-scroll' }, c), ['未來 ' + b.horizonDays + ' 個交易日', '5%', '25%', '50%', '75%', '95%'], [['期末報酬', [pct(b.ret.p5), cls(b.ret.p5)], [pct(b.ret.p25), cls(b.ret.p25)], [pct(b.ret.p50), cls(b.ret.p50)], [pct(b.ret.p75), cls(b.ret.p75)], [pct(b.ret.p95), cls(b.ret.p95)]], ['路徑內最大回撤', [pct(b.mdd.p5), cls(b.mdd.p5)], '', [pct(b.mdd.p50), cls(b.mdd.p50)], '', [pct(b.mdd.p95), cls(b.mdd.p95)]]]); node('p', { class: 'tool-hint', text: '做法：把策略的歷史日報酬以 10 天為一塊重抽 ' + b.paths + ' 條路徑（固定亂數種子 42，可重現）。假設未來的報酬分布和過去一樣，忽略了市場環境改變；虧損機率 ' + pctAbs(b.probLoss, 0) + '。' }, c); }
    else node('p', { class: 'tool-hint', text: '權益曲線不到 60 個交易日，不做模擬。' }, c);
    node('h4', { class: 'tool-sub', text: '估值回測（PE／PB／殖利率）' }, c);
    node('p', { class: 'tool-error', text: '尚不可用：這個版本沒有「當時已公布」的財報與估值資料（point-in-time），用今天的財報回填歷史會有前視偏差和存活者偏差，所以不提供。' }, c);
  }
  function exportReport() {
    var out = state.last; if (!out) { status('先執行一次回測再匯出。', true); return; }
    var report = { generatedAt: out.computedAt, dataVersion: D.generated, settings: out.cfg, period: [out.start, out.end], currency: out.currency,
      sources: out.symbols.map(function (s) { return { id: s.id, source: s.meta.source, adjusted: s.meta.adjusted, first: s.meta.first, last: s.meta.last, bars: s.meta.bars, quality: s.meta.quality }; }),
      results: out.symbols.map(function (s) { return { id: s.id, strategy: s.metrics, buyHold: s.bhMetrics, trades: s.sim.trades, costs: s.sim.costs, dca: Object.keys(s.dca).map(function (k) { var r = s.dca[k]; return { variant: k, invested: r.investedTotal, final: r.finalValue, xirr: r.xirr, twrMdd: r.twrMdd.mdd, buys: r.buys.length }; }) }; }),
      portfolio: out.portfolio && !out.portfolio.error ? { metrics: out.portfolio.metrics, rebalances: out.portfolio.rebalances, costs: out.portfolio.costs } : out.portfolio,
      advanced: out.adv, disclaimer: '教育用途，不構成買賣建議。過去績效不代表未來；成本與利率為假設值。' };
    var json = JSON.stringify(report, null, 1), csv = E.toCSV(state.allTrades || [], [{ label: '標的', key: 'id' }, { label: '訊號日', key: 'signalDate' }, { label: '成交日', key: 'entryDate' }, { label: '成交價', key: 'entryPrice' }, { label: '數量', key: 'qty' }, { label: '買進費用', key: 'entryFee' }, { label: '出場日', key: 'exitDate' }, { label: '出場價', key: 'exitPrice' }, { label: '賣出費用', key: 'exitFee' }, { label: '交易稅', key: 'tax' }, { label: '損益', key: 'pnl' }, { label: '報酬', key: 'ret' }, { label: '原因', key: 'reason' }]);
    var ta = el('lab-export-text'); ta.hidden = false; ta.value = '=== 回測報告 JSON ===\n' + json + '\n\n=== 交易明細 CSV ===\n' + csv;
    function dl(name, text, type) { try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { /* 預覽環境可能擋下載 */ } }
    dl('backtest-report.json', json, 'application/json'); dl('backtest-trades.csv', '﻿' + csv, 'text/csv');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(function () { status('報告已複製到剪貼簿；瀏覽器允許的話也會下載 JSON 和 CSV。'); }, function () { ta.select(); status('已把報告放在下方文字框，請自行複製。'); });
    else { ta.select(); status('已把報告放在下方文字框，請自行複製。'); }
  }

  ['mode', 'scale', 'colors'].forEach(function (k) { document.querySelectorAll('input[name="lab-' + k + '-r"]').forEach(function (r) { r.addEventListener('change', function () { el('lab-' + k).value = r.value; el('lab-' + k).dispatchEvent(new Event('change')); }); }); });
  el('lab-trade-filter').addEventListener('input', function () { state.tradeFilter = this.value.trim(); if (state.last) renderTrades(state.last); });
  renderData(); buildForm();
  if (location.hash === '#lab') { el('lab-mode').value = 'advanced'; document.querySelector('input[name="lab-mode-r"][value="advanced"]').checked = true; document.body.classList.add('lab-advanced'); }
})();
