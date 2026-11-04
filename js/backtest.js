/* 台股入門 60 天 — 回測頁（只負責畫面；數字都在 data/backtest/results.js，由 tools/run_backtest.py 算好）。 */
(function () {
  'use strict';

  var R = window.BACKTEST;
  function el(id) { return document.getElementById(id); }
  function node(tag, attrs, parent) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    if (parent) parent.appendChild(n);
    return n;
  }
  function svgNode(tag, attrs, parent) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function pct(x, d) { return x === null || x === undefined || !isFinite(x) ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(d === undefined ? 1 : d) + '%'; }
  function pctAbs(x, d) { return x === null || x === undefined || !isFinite(x) ? '—' : (x * 100).toFixed(d === undefined ? 1 : d) + '%'; }
  function num(x, d) { return x === null || x === undefined || !isFinite(x) ? '—' : Number(x).toFixed(d === undefined ? 2 : d); }
  function money(x, market) { return x === null || x === undefined ? '—' : (market === 'tw' ? 'NT$' : 'US$') + Math.round(x).toLocaleString('zh-Hant-TW'); }
  function cls(x) { return x > 0 ? 'bt-pos' : x < 0 ? 'bt-neg' : ''; }
  function cell(tr, text, extra, head) {
    var c = node(head ? 'th' : 'td', { text: text }, tr);
    if (extra) c.className = extra;
    return c;
  }
  function label(id) { var s = R.results[id].symbol; return s.name + '（' + s.id.replace('.TW', '') + '）'; }
  // 曲線在 results.js 裡是壓縮格式 { from, step, v, tail }（見 tools/backtest/report.py），這裡還原成 [[日期, 值], ...]
  function expand(e) {
    if (!e || !e.v) return [];
    var t0 = Date.parse(e.from), pts = [];
    for (var i = 0; i < e.v.length; i++) pts.push([new Date(t0 + i * e.step * 86400000).toISOString().slice(0, 10), e.v[i]]);
    if (e.tail) pts.push(e.tail);
    return pts;
  }

  if (!R || !R.order || !R.order.length) {
    el('bt-error').hidden = false;
    el('bt-error').textContent = '還沒有回測結果。請先跑 python3 tools/fetch_history.py 再跑 python3 tools/run_backtest.py，或等 GitHub Actions 每週自動更新。';
    return;
  }

  var STRAT = {};
  R.strategies.forEach(function (s) { STRAT[s.id] = s; });
  var TIMING = ['buy_hold', 'sma_cross', 'sma_filter'].filter(function (s) { return STRAT[s]; });
  var COLORS = { buy_hold: 'var(--ink)', sma_cross: 'var(--s1)', sma_filter: 'var(--s2)', dca_value: 'var(--red)', dca_invested: 'var(--ink-2)' };
  var state = { sym: R.order[0], scale: 'linear' };

  el('bt-generated').textContent = '這一版是 ' + R.generated + ' 算的。';
  el('bt-costs').textContent = '台股手續費 ' + (R.costs.tw.fee_rate * R.costs.tw.fee_discount * 100).toFixed(4).replace(/0+$/, '') + '%（牌告 0.1425% 打 ' + (R.costs.tw.fee_discount * 10) + ' 折，買賣各一次）、交易稅 ETF ' + (R.costs.tw.tax.etf * 100) + '%、股票 ' + (R.costs.tw.tax.stock * 100) + '%；美股手續費 0。';

  // ---- 總覽表 ----
  function renderBoard() {
    var t = el('bt-board');
    t.innerHTML = '';
    var hd = node('tr', {}, node('thead', {}, t));
    ['標的', '區間', '買進持有 年化', '最大回檔', '定期定額 XIRR', '均線交叉 年化', '年線濾網 年化'].forEach(function (h, i) { cell(hd, h, i >= 2 ? 'num' : '', true); });
    var tb = node('tbody', {}, t);
    R.order.forEach(function (id) {
      var r = R.results[id], tr = node('tr', { 'data-sym': id, tabindex: '0', role: 'button' }, tb);
      if (id === state.sym) tr.className = 'is-active';
      var th = cell(tr, label(id) + (r.adjusted ? '' : ' 不含息'), '', true);
      th.scope = 'row';
      cell(tr, r.first + '～' + r.last + '（' + num(r.results.buy_hold.metrics.years, 1) + ' 年）', 'note-cell');
      var bh = r.results.buy_hold.metrics;
      cell(tr, pct(bh.cagr), 'num ' + cls(bh.cagr));
      cell(tr, pct(bh.mdd), 'num ' + cls(bh.mdd));
      var d = r.results.dca;
      cell(tr, d ? pct(d.metrics.xirr) : '—', 'num ' + (d ? cls(d.metrics.xirr) : ''));
      ['sma_cross', 'sma_filter'].forEach(function (s) {
        var x = r.results[s];
        cell(tr, x ? pct(x.metrics.cagr) : '略過', 'num ' + (x ? cls(x.metrics.cagr) : ''));
      });
      function pick() { state.sym = id; renderAll(); document.getElementById('curve').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      tr.addEventListener('click', pick);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    el('bt-missing').textContent = R.missing && R.missing.length ? '還沒有資料的標的：' + R.missing.join('、') + '。第一次自動更新跑完就會出現。' : '';
  }

  // ---- 標的選單 ----
  function renderSyms() {
    var f = el('bt-syms');
    f.querySelectorAll('label').forEach(function (l) { l.remove(); });
    R.order.forEach(function (id) {
      var l = node('label', {}, f);
      var i = node('input', { type: 'radio', name: 'bt-sym', value: id }, l);
      i.checked = id === state.sym;
      i.addEventListener('change', function () { state.sym = id; renderAll(); });
      l.appendChild(document.createTextNode(' ' + R.results[id].symbol.id.replace('.TW', '')));
    });
  }

  // ---- 折線圖（SVG）----
  function drawLines(container, series, opts) {
    // series: [{ id, name, color, points: [[date, value]] }]
    container.innerHTML = '';
    var W = Math.max(320, container.clientWidth || 640), H = 280, padL = 52, padR = 12, padT = 12, padB = 28;
    var log = opts && opts.log;
    var all = [];
    series.forEach(function (s) { s.points.forEach(function (p) { if (p[1] > 0 || !log) all.push(p[1]); }); });
    if (!all.length) return;
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (log) { lo = Math.log(lo); hi = Math.log(hi); }
    if (hi === lo) { hi += 1; lo -= 1; }
    var pad = (hi - lo) * 0.05; lo -= pad; hi += pad;
    var dates = series[0].points.map(function (p) { return p[0]; });
    var t0 = Date.parse(dates[0]), t1 = Date.parse(dates[dates.length - 1]);
    series.forEach(function (s) { s.points.forEach(function (p) { t0 = Math.min(t0, Date.parse(p[0])); t1 = Math.max(t1, Date.parse(p[0])); }); });
    function X(d) { return padL + (Date.parse(d) - t0) / Math.max(1, t1 - t0) * (W - padL - padR); }
    function Y(v) { var y = log ? Math.log(v) : v; return padT + (hi - y) / (hi - lo) * (H - padT - padB); }
    var svg = svgNode('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, class: 'bt-svg' }, container);
    // 橫格線
    var ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      var yv = lo + (hi - lo) * i / ticks, v = log ? Math.exp(yv) : yv, y = padT + (hi - yv) / (hi - lo) * (H - padT - padB);
      svgNode('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: 'bt-grid' }, svg);
      var txt = svgNode('text', { x: padL - 6, y: y + 4, class: 'bt-axis', 'text-anchor': 'end' }, svg);
      txt.textContent = opts && opts.fmt ? opts.fmt(v) : v.toFixed(2);
    }
    // 年份
    var y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear(), span = y1 - y0, step = span > 20 ? 5 : span > 8 ? 2 : 1;
    for (var yy = y0 + 1; yy <= y1; yy++) {
      if ((yy - y0) % step) continue;
      var d = yy + '-01-01', x = X(d);
      if (x < padL || x > W - padR) continue;
      svgNode('line', { x1: x, x2: x, y1: padT, y2: H - padB, class: 'bt-grid' }, svg);
      var t = svgNode('text', { x: x, y: H - 8, class: 'bt-axis', 'text-anchor': 'middle' }, svg);
      t.textContent = yy;
    }
    if (span < 1) {
      var ta = svgNode('text', { x: padL, y: H - 8, class: 'bt-axis' }, svg); ta.textContent = dates[0];
      var tb = svgNode('text', { x: W - padR, y: H - 8, class: 'bt-axis', 'text-anchor': 'end' }, svg); tb.textContent = dates[dates.length - 1];
    }
    if (opts && opts.baseline !== undefined && opts.baseline > (log ? Math.exp(lo) : lo) && opts.baseline < (log ? Math.exp(hi) : hi)) {
      svgNode('line', { x1: padL, x2: W - padR, y1: Y(opts.baseline), y2: Y(opts.baseline), class: 'bt-base' }, svg);
    }
    series.forEach(function (s) {
      var dd = '';
      s.points.forEach(function (p, k) { if (log && !(p[1] > 0)) return; dd += (dd ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); });
      svgNode('path', { d: dd, fill: 'none', stroke: s.color, 'stroke-width': s.width || 2, 'stroke-linejoin': 'round' }, svg);
    });
  }

  function legend(container, items) {
    container.innerHTML = '';
    items.forEach(function (it) {
      var s = node('span', { class: 'bt-key' }, container);
      node('i', { style: 'background:' + it.color }, s);
      s.appendChild(document.createTextNode(it.name));
    });
  }

  function renderCurve() {
    var r = R.results[state.sym];
    el('bt-name').textContent = label(state.sym) + '　' + r.first + '～' + r.last + (r.adjusted ? '（含息）' : '（不含息）');
    var series = TIMING.filter(function (s) { return r.results[s]; }).map(function (s) {
      return { id: s, name: STRAT[s].name, color: COLORS[s], points: expand(r.results[s].equity), width: s === 'buy_hold' ? 2.5 : 1.75 };
    });
    legend(el('bt-legend'), series);
    drawLines(el('bt-chart'), series, { log: state.scale === 'log', baseline: 1, fmt: function (v) { return v >= 10 ? v.toFixed(0) : v.toFixed(2); } });
  }

  // ---- 策略比較 ----
  function renderCompare() {
    var r = R.results[state.sym], t = el('bt-compare');
    el('bt-compare-desc').textContent = label(state.sym) + '，' + r.first + '～' + r.last + '。成本：' + r.cost + '。';
    t.innerHTML = '';
    var strategies = TIMING.filter(function (s) { return r.results[s]; });
    var hd = node('tr', {}, node('thead', {}, t));
    cell(hd, '', '', true);
    strategies.forEach(function (s) { cell(hd, STRAT[s].name, 'num', true); });
    var tb = node('tbody', {}, t);
    var rows = [
      ['年化報酬', function (x) { return [pct(x.metrics.cagr), cls(x.metrics.cagr)]; }],
      ['總報酬', function (x) { return [pct(x.metrics.total_return), cls(x.metrics.total_return)]; }],
      ['最大回檔', function (x) { return [pct(x.metrics.mdd), cls(x.metrics.mdd)]; }],
      ['回檔期間', function (x) { var m = x.metrics; return [m.mdd_peak ? m.mdd_peak + ' → ' + m.mdd_trough + (m.mdd_recovery ? '，' + m.mdd_days + ' 天後回到高點' : '，還沒回到高點') : '—', '']; }],
      ['年化波動', function (x) { return [pctAbs(x.metrics.vol), '']; }],
      ['夏普值', function (x) { return [num(x.metrics.sharpe), '']; }],
      ['Calmar', function (x) { return [num(x.metrics.calmar), '']; }],
      ['交易次數', function (x) { return [String(x.trades), '']; }],
      ['勝率（已平倉）', function (x) { return [x.win_rate === null || x.win_rate === undefined ? '—' : pctAbs(x.win_rate, 0), '']; }],
      ['在場時間', function (x) { return [pctAbs(x.exposure, 0), '']; }],
      ['現在', function (x) { return [x.last_position ? '持有' : '空手', '']; }]
    ];
    rows.forEach(function (row) {
      var tr = node('tr', {}, tb);
      var th = cell(tr, row[0], '', true); th.scope = 'row';
      strategies.forEach(function (s) { var v = row[1](r.results[s]); cell(tr, v[0], 'num ' + v[1]); });
    });
    Object.keys(r.skipped || {}).forEach(function (s) {
      var tr = node('tr', {}, tb);
      cell(tr, STRAT[s] ? STRAT[s].name : s, '', true);
      var c = cell(tr, r.skipped[s], 'note-cell'); c.colSpan = strategies.length;
    });
    var desc = node('tr', {}, tb);
    cell(desc, '規則', '', true);
    strategies.forEach(function (s) { cell(desc, STRAT[s].desc, 'note-cell'); });
  }

  // ---- 定期定額 ----
  function renderDca() {
    var r = R.results[state.sym], d = r.results.dca, m = r.symbol.market;
    if (!d) { el('bt-dca-desc').textContent = '這檔沒有跑定期定額。'; el('bt-dca-chart').innerHTML = ''; el('bt-dca-table').innerHTML = ''; return; }
    var k = d.metrics;
    el('bt-dca-desc').textContent = label(state.sym) + '：從 ' + k.start + ' 起每個月第一個交易日投入 ' + money(k.amount, m) + '，共買 ' + k.buys + ' 次，到 ' + k.end + ' 為止。';
    var series = [
      { name: '市值', color: COLORS.dca_value, points: expand(d.equity), width: 2.5 },
      { name: '累計投入', color: COLORS.dca_invested, points: expand(d.invested), width: 1.5 }
    ];
    legend(el('bt-dca-legend'), series);
    drawLines(el('bt-dca-chart'), series, { fmt: function (v) { return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v.toFixed(0); } });
    var t = el('bt-dca-table');
    t.innerHTML = '';
    var tb = node('tbody', {}, t);
    [['累計投入', money(k.invested, m), ''], ['最後市值', money(k.final, m), ''], ['損益', (k.profit >= 0 ? '+' : '−') + money(Math.abs(k.profit), m) + '（' + pct(k.invested ? k.profit / k.invested : null) + '）', cls(k.profit)],
     ['年化報酬（XIRR）', pct(k.xirr), cls(k.xirr)], ['最大回檔（市值÷投入）', pct(k.mdd), cls(k.mdd)]].forEach(function (row) {
      var tr = node('tr', {}, tb);
      var th = cell(tr, row[0], '', true); th.scope = 'row';
      cell(tr, row[1], 'num ' + row[2]);
    });
  }

  // ---- 每年報酬 ----
  function renderYearly() {
    var r = R.results[state.sym], t = el('bt-yearly');
    t.innerHTML = '';
    var strategies = TIMING.filter(function (s) { return r.results[s]; });
    var years = Object.keys(r.results.buy_hold.yearly);
    var hd = node('tr', {}, node('thead', {}, t));
    cell(hd, '年', '', true);
    strategies.forEach(function (s) { cell(hd, STRAT[s].name, 'num', true); });
    var tb = node('tbody', {}, t);
    years.forEach(function (y) {
      var tr = node('tr', {}, tb);
      var th = cell(tr, y, '', true); th.scope = 'row';
      strategies.forEach(function (s) { var v = r.results[s].yearly[y]; cell(tr, pct(v), 'num ' + cls(v)); });
    });
  }

  // ---- 滾動報酬 ----
  function renderRolling() {
    var t = el('bt-rolling');
    t.innerHTML = '';
    var hd = node('tr', {}, node('thead', {}, t));
    ['標的', '抱幾年', '進場日數', '最差（年化）', '中間', '最好', '最後是賺的'].forEach(function (h, i) { cell(hd, h, i >= 2 ? 'num' : '', true); });
    var tb = node('tbody', {}, t);
    var any = false;
    R.order.forEach(function (id) {
      var roll = R.results[id].results.buy_hold.rolling, keys = Object.keys(roll);
      if (!keys.length) return;
      keys.forEach(function (k, i) {
        any = true;
        var x = roll[k], tr = node('tr', {}, tb);
        if (id === state.sym) tr.className = 'is-active';
        var th = cell(tr, i === 0 ? label(id) : '', '', true); th.scope = 'row';
        cell(tr, x.years + ' 年');
        cell(tr, x.n.toLocaleString('zh-Hant-TW'), 'num');
        cell(tr, pct(x.min), 'num ' + cls(x.min));
        cell(tr, pct(x.median), 'num ' + cls(x.median));
        cell(tr, pct(x.max), 'num ' + cls(x.max));
        cell(tr, pctAbs(x.pct_positive, 0), 'num');
      });
    });
    if (!any) {
      var tr = node('tr', {}, tb);
      var c = cell(tr, '目前的資料都不到 1 年，等第一次自動更新抓到完整歷史再看。', 'note-cell'); c.colSpan = 7;
    }
  }

  function renderAll() {
    renderBoard();
    renderSyms();
    renderCurve();
    renderCompare();
    renderDca();
    renderYearly();
    renderRolling();
  }

  document.querySelectorAll('input[name="bt-scale"]').forEach(function (i) {
    i.addEventListener('change', function () { state.scale = i.value; renderCurve(); });
  });
  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { renderCurve(); renderDca(); }, 150); });

  try {
    var q = new URLSearchParams(location.search).get('sym');
    if (q && R.results[q]) state.sym = q;
  } catch (e) { /* 忽略 */ }
  renderAll();
})();
