/* 台股入門 60 天 — 策略回測實驗室：把一條買賣規則套到過去的日線，和「一直抱著」比一比 */
(function () {
  'use strict';

  var SC = window.StockChart, TC = window.TrendCore;
  function el(id) { return document.getElementById(id); }
  function num(id, d) { var v = parseFloat(el(id).value); return isFinite(v) ? v : d; }
  function pc(x) { return (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%'; }

  // 每一根收盤後的「想不想持有」：true 持有、false 空手、null 資料不夠先不動
  function signals(b, rule, n1, n2, lo, hi) {
    var c = b.map(function (x) { return x.c; });
    if (rule === 'trend') {
      var m = SC.sma(c, n1);
      return c.map(function (x, i) { return m[i] == null ? null : x > m[i]; });
    }
    if (rule === 'cross') {
      var f = SC.sma(c, n1), s = SC.sma(c, n2);
      return c.map(function (x, i) { return f[i] == null || s[i] == null ? null : f[i] > s[i]; });
    }
    var r = SC.rsi(c, 12), want = false;
    return c.map(function (x, i) {
      if (r[i] == null) return null;
      if (r[i] < lo) want = true; else if (r[i] > hi) want = false;
      return want;
    });
  }

  // 收盤後決定、隔天開盤成交；每次買或賣扣一次成本
  function run(b, sig, cost) {
    var eq = 1, pos = false, entry = 0, trades = 0, wins = 0, inDays = 0, curve = [1], peak = 1, mdd = 0;
    for (var i = 1; i < b.length; i++) {
      var want = sig[i - 1];
      if (want !== null && want !== pos) {
        if (want) { eq *= (1 - cost); entry = eq; pos = true; eq *= b[i].c / b[i].o; }
        else { eq *= b[i].o / b[i - 1].c; eq *= (1 - cost); pos = false; trades++; if (eq > entry) wins++; }
      } else if (pos) eq *= b[i].c / b[i - 1].c;
      if (pos) inDays++;
      curve.push(eq);
      peak = Math.max(peak, eq);
      mdd = Math.min(mdd, eq / peak - 1);
    }
    if (pos) { trades++; if (eq > entry) wins++; }
    return { ret: eq - 1, curve: curve, mdd: mdd, trades: trades, wins: wins, inPct: inDays / (b.length - 1) };
  }

  function hold(b) {
    var curve = [], peak = 0, mdd = 0;
    b.forEach(function (x) {
      var e = x.c / b[0].c;
      curve.push(e);
      peak = Math.max(peak, e);
      mdd = Math.min(mdd, e / peak - 1);
    });
    return { ret: curve[curve.length - 1] - 1, curve: curve, mdd: mdd };
  }

  function chart(a, h) {
    var W = 640, H = 220, P = 8, all = a.concat(h);
    var mx = Math.max.apply(null, all), mn = Math.min.apply(null, all);
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'bt-chart');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', '資金曲線：規則和一直抱著的比較');
    function y(v) { return P + (mx - v) / ((mx - mn) || 1) * (H - 2 * P); }
    var base = document.createElementNS(NS, 'line');
    base.setAttribute('x1', 0); base.setAttribute('x2', W);
    base.setAttribute('y1', y(1)); base.setAttribute('y2', y(1));
    base.setAttribute('class', 'lab-guide');
    svg.appendChild(base);
    [[h, 's2'], [a, 's1']].forEach(function (p) {
      var d = p[0].map(function (v, i) { return (i ? 'L' : 'M') + (i / (p[0].length - 1) * W).toFixed(1) + ' ' + y(v).toFixed(1); }).join('');
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'lab-line ' + p[1]);
      svg.appendChild(path);
    });
    return svg;
  }

  var BARS = null;

  function render() {
    var out = el('bt-out');
    out.textContent = '';
    var sym = el('bt-sym').value, rule = el('bt-rule').value;
    var n1 = Math.max(2, Math.round(num('bt-n1', 20))), n2 = Math.max(3, Math.round(num('bt-n2', 60)));
    var lo = num('bt-lo', 30), hi = num('bt-hi', 70), cost = Math.max(0, num('bt-cost', 0.2)) / 100;
    var b = BARS[sym];
    if (!b || b.length < 80) { out.textContent = '這檔的資料不夠。'; return; }
    if (rule === 'cross' && n1 >= n2) { out.textContent = '短均線的天數要比長均線少。'; return; }
    var r = run(b, signals(b, rule, n1, n2, lo, hi), cost), h = hold(b);

    var head = document.createElement('p');
    head.className = 'tr-score';
    head.textContent = sym + '，' + b[0].d + ' ～ ' + b[b.length - 1].d + '（' + b.length + ' 個交易日）';
    out.appendChild(head);

    var legend = document.createElement('p');
    legend.className = 'bt-legend';
    legend.innerHTML = '<span class="bt-key s1"></span>照規則買賣　<span class="bt-key s2"></span>一直抱著　<span class="bt-key base"></span>本金';
    out.appendChild(legend);
    out.appendChild(chart(r.curve, h.curve));

    var t = document.createElement('table');
    t.className = 'tool-table wide';
    t.innerHTML = '<thead><tr><th></th><th class="num">照規則</th><th class="num">一直抱著</th></tr></thead>';
    var tb = document.createElement('tbody');
    [['總報酬', pc(r.ret), pc(h.ret)],
     ['最大回落', pc(r.mdd), pc(h.mdd)],
     ['交易次數（買到賣算一次）', String(r.trades), '1'],
     ['賺錢的次數', r.trades ? r.wins + ' / ' + r.trades : '—', ''],
     ['在場內的時間', Math.round(r.inPct * 100) + '%', '100%']].forEach(function (row) {
      var tr = document.createElement('tr');
      row.forEach(function (c, i) {
        var td = document.createElement(i ? 'td' : 'th');
        if (i) td.className = 'num';
        td.textContent = c;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.appendChild(t);
    out.appendChild(wrap);

    var note = document.createElement('p');
    note.className = 'notice';
    var beat = r.ret > h.ret, safer = r.mdd > h.mdd;
    note.textContent = (beat ? '這段期間，規則的報酬贏過一直抱著。' : '這段期間，規則的報酬輸給一直抱著。') +
      (safer ? '最大回落比較小，' : '最大回落沒有比較小，') +
      (beat ? '但只有一年多的資料、只試一檔，很可能是運氣或「調參數調出來的」。換別檔、別段時間再試試看。'
            : '不過這很常見：大部分簡單的規則，扣掉成本後都很難贏過買進持有。');
    out.appendChild(note);
  }

  function start() {
    BARS = TC.collect(window);
    var sel = el('bt-sym');
    if (!sel.options.length) {
      TC.SYMBOLS.forEach(function (s) {
        if (!BARS[s.id]) return;
        var o = document.createElement('option');
        o.value = s.id;
        o.textContent = s.id + (s.name ? '　' + s.name : '');
        sel.appendChild(o);
      });
    }
    function sync() {
      var rule = el('bt-rule').value;
      el('bt-n2-wrap').hidden = rule !== 'cross';
      el('bt-n1-wrap').hidden = rule === 'rsi';
      el('bt-lo-wrap').hidden = el('bt-hi-wrap').hidden = rule !== 'rsi';
    }
    el('bt-form').oninput = el('bt-form').onchange = function () { sync(); render(); };
    sync();
    render();
  }

  if (window.US_BARS && window.US_BARS.length) { start(); return; }
  var IDX = window.US_INDEX || { files: [] }, left = IDX.files.length;
  if (!left) { el('bt-out').textContent = '找不到資料檔。'; return; }
  IDX.files.forEach(function (f) {
    var s = document.createElement('script');
    s.src = 'data/us/' + f + '?v=' + encodeURIComponent(IDX.updated || '');
    s.onload = s.onerror = function () { if (--left === 0) start(); };
    document.head.appendChild(s);
  });
})();
