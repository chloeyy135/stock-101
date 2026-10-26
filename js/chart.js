/* 台股入門 60 天 — 指標實驗室
   畫 K 線、均線、布林通道、成交量、MACD、KD、RSI，點一根 K 線就用白話說明每個指標在講什麼。
   看盤指南用電腦產生的示意走勢；美股日報（#lab 加上 data-external）改由 trend.js 用 StockChart.load() 給真實資料。 */
(function () {
  'use strict';

  var SVG = 'http://www.w3.org/2000/svg';
  var DAYS = 600;               // 產生的交易日數（週 K 由它合併而成）
  var VIEW = { day: 60, week: 52 };
  var MA = [5, 20, 60];
  var RSI = [6, 12];

  // 指標計算不需要畫面，先給別的檔案用（美股日報、tools/us-daily.js）
  window.StockChart = { sma: sma, ema: ema, boll: boll, macd: macd, kd: kd, rsi: rsi, series: series, toWeekly: toWeekly, weeklyByDate: weeklyByDate, makeDaily: makeDaily, MA: MA, RSI: RSI };

  var root = document.getElementById('lab');
  if (!root) return;

  var external = root.hasAttribute('data-external');
  var state = { seed: 20261026, period: 'day', main: 'ma', sub: 'vol', color: 'tw', sel: -1 };
  var data = null;   // { day: series, week: series }
  var geom = null;   // 最近一次畫圖的版面，點選時用來換算是哪一根
  var label = '';    // 真實資料的名稱，例如「TSLA 特斯拉」

  function el(id) { return document.getElementById(id); }

  // ---------- 示意資料 ----------

  // 可重現的亂數（同一個 seed 每次產生一樣的走勢）
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    var u = 1 - r(), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function round2(x) { return Math.round(x * 100) / 100; }

  // 走勢分成幾段：上漲、盤整、下跌輪流出現，每段 15～45 天
  function makeDaily(seed) {
    var r = rng(seed);
    var drifts = [0.006, 0, -0.005, 0.003, -0.002];
    var bars = [];
    var close = 100, left = 0, drift = 0, vol = 0.015;
    for (var i = 0; i < DAYS; i++) {
      if (left <= 0) {
        left = 15 + Math.floor(r() * 31);
        drift = drifts[Math.floor(r() * drifts.length)];
        vol = 0.009 + r() * 0.012;
      }
      left--;
      var open = close * (1 + gauss(r) * vol * 0.3);
      var ret = drift + gauss(r) * vol;
      var c = Math.max(5, close * (1 + ret));
      var hi = Math.max(open, c) * (1 + Math.abs(gauss(r)) * vol * 0.5);
      var lo = Math.min(open, c) * (1 - Math.abs(gauss(r)) * vol * 0.5);
      var v = 8000 * (1 + 1.6 * Math.abs(ret) / vol) * (0.75 + r() * 0.5) * (ret < 0 && drift < 0 ? 1.2 : 1);
      bars.push({ o: round2(open), h: round2(hi), l: round2(lo), c: round2(c), v: Math.round(v) });
      close = c;
    }
    return bars;
  }

  // 每 5 根日 K 合成一根週 K：開＝第一天開盤，收＝最後一天收盤，高低取最高最低，量相加
  function toWeekly(days) {
    var out = [];
    for (var i = 0; i + 5 <= days.length; i += 5) {
      var w = { o: days[i].o, h: -Infinity, l: Infinity, c: days[i + 4].c, v: 0 };
      for (var j = i; j < i + 5; j++) {
        w.h = Math.max(w.h, days[j].h);
        w.l = Math.min(w.l, days[j].l);
        w.v += days[j].v;
      }
      out.push(w);
    }
    return out;
  }

  // 真實資料的週 K：同一個星期（週一到週五）的日 K 合成一根，日期記那週最後一個交易日
  function weeklyByDate(days) {
    var out = [], cur = null, key = null;
    days.forEach(function (b) {
      var t = Date.UTC(+b.d.slice(0, 4), +b.d.slice(5, 7) - 1, +b.d.slice(8, 10));
      var k = t - ((new Date(t).getUTCDay() + 6) % 7) * 864e5;
      if (k !== key) { cur = { d: b.d, o: b.o, h: b.h, l: b.l, c: b.c, v: 0 }; out.push(cur); key = k; }
      cur.h = Math.max(cur.h, b.h);
      cur.l = Math.min(cur.l, b.l);
      cur.c = b.c;
      cur.v += b.v;
      cur.d = b.d;
    });
    return out;
  }

  // ---------- 指標計算 ----------

  function sma(arr, n) {
    var out = [], sum = 0;
    for (var i = 0; i < arr.length; i++) {
      sum += arr[i];
      if (i >= n) sum -= arr[i - n];
      out.push(i >= n - 1 ? sum / n : NaN);
    }
    return out;
  }
  function ema(arr, n) {
    var k = 2 / (n + 1), out = [], prev = arr[0];
    for (var i = 0; i < arr.length; i++) {
      prev = i === 0 ? arr[0] : arr[i] * k + prev * (1 - k);
      out.push(prev);
    }
    return out;
  }

  // 布林通道：中軌 20 期均線，上下軌 ±2 個標準差
  function boll(closes) {
    var mid = sma(closes, 20), up = [], dn = [];
    for (var i = 0; i < closes.length; i++) {
      if (i < 19) { up.push(NaN); dn.push(NaN); continue; }
      var s = 0;
      for (var j = i - 19; j <= i; j++) s += Math.pow(closes[j] - mid[i], 2);
      var sd = Math.sqrt(s / 20);
      up.push(mid[i] + 2 * sd);
      dn.push(mid[i] - 2 * sd);
    }
    return { mid: mid, up: up, dn: dn };
  }

  // MACD(12, 26, 9)：DIF＝快慢 EMA 的差，DEA＝DIF 的 9 期 EMA，柱＝DIF − DEA
  function macd(closes) {
    var f = ema(closes, 12), s = ema(closes, 26), dif = [];
    for (var i = 0; i < closes.length; i++) dif.push(f[i] - s[i]);
    var dea = ema(dif, 9), hist = [];
    for (i = 0; i < closes.length; i++) hist.push(i < 33 ? NaN : dif[i] - dea[i]);
    for (i = 0; i < 33; i++) { dif[i] = NaN; dea[i] = NaN; }
    return { dif: dif, dea: dea, hist: hist };
  }

  // KD(9, 3, 3)：RSV＝收盤在最近 9 期高低區間的位置，K、D 是平滑後的 RSV
  function kd(bars) {
    var K = [], D = [], k = 50, d = 50;
    for (var i = 0; i < bars.length; i++) {
      if (i < 8) { K.push(NaN); D.push(NaN); continue; }
      var hi = -Infinity, lo = Infinity;
      for (var j = i - 8; j <= i; j++) { hi = Math.max(hi, bars[j].h); lo = Math.min(lo, bars[j].l); }
      var rsv = hi === lo ? 50 : (bars[i].c - lo) / (hi - lo) * 100;
      k = k * 2 / 3 + rsv / 3;
      d = d * 2 / 3 + k / 3;
      K.push(k); D.push(d);
    }
    return { k: K, d: D };
  }

  // RSI：一段時間內「漲的幅度」占「漲跌總幅度」的比例（Wilder 平滑）
  function rsi(closes, n) {
    var out = [NaN], up = 0, dn = 0;
    for (var i = 1; i < closes.length; i++) {
      var ch = closes[i] - closes[i - 1];
      var u = Math.max(ch, 0), d = Math.max(-ch, 0);
      if (i <= n) {
        up += u / n; dn += d / n;
        out.push(i < n ? NaN : (dn === 0 ? 100 : 100 - 100 / (1 + up / dn)));
      } else {
        up = (up * (n - 1) + u) / n;
        dn = (dn * (n - 1) + d) / n;
        out.push(dn === 0 ? 100 : 100 - 100 / (1 + up / dn));
      }
    }
    return out;
  }

  function series(bars) {
    var closes = bars.map(function (b) { return b.c; });
    var vols = bars.map(function (b) { return b.v; });
    var s = { bars: bars, ma: {}, rsi: {}, boll: boll(closes), macd: macd(closes), kd: kd(bars), vma: sma(vols, 5) };
    MA.forEach(function (n) { s.ma[n] = sma(closes, n); });
    RSI.forEach(function (n) { s.rsi[n] = rsi(closes, n); });
    return s;
  }

  function build() {
    var days = makeDaily(state.seed);
    data = { day: series(days), week: series(toWeekly(days)) };
  }

  // ---------- 畫圖 ----------

  function node(tag, attrs, parent) {
    var n = document.createElementNS(SVG, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmt(x, d) { return isFinite(x) ? x.toFixed(d === undefined ? 2 : d) : '—'; }
  function fmtVol(v) { return v >= 10000 ? (v / 10000).toFixed(1) + ' 萬' : String(Math.round(v)); }
  function niceTicks(lo, hi, count) {
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / count)));
    var err = span / count / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var out = [];
    for (var t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(t);
    return out;
  }

  function view() {
    var s = data[state.period], n = VIEW[state.period];
    var start = Math.max(0, s.bars.length - n);
    return { s: s, start: start, end: s.bars.length };
  }

  function unit() { return state.period === 'day' ? '天' : '週'; }
  var WEEKDAY = '日一二三四五六';
  function dayName(d) { return WEEKDAY[new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).getUTCDay()]; }
  // 選到的那一根怎麼稱呼：示意資料用「幾天前」，真實資料用日期
  function ago(i, end) {
    var b = data[state.period].bars[i];
    if (b && b.d) {
      var d = b.d.replace(/-/g, '/');
      return state.period === 'day' ? d + '（' + dayName(b.d) + '）' : '截至 ' + d + ' 的那一週';
    }
    var k = end - 1 - i;
    return k === 0 ? '最新' : k + ' ' + unit() + '前';
  }
  function axisLabel(i, end) {
    var b = data[state.period].bars[i];
    if (!b || !b.d) return ago(i, end);
    return state.period === 'day' ? +b.d.slice(5, 7) + '/' + +b.d.slice(8, 10) : b.d.slice(0, 4) + '/' + +b.d.slice(5, 7);
  }

  function render() {
    var box = el('lab-chart');
    var W = Math.max(300, Math.floor(box.clientWidth || 340));
    var wide = W >= 560;
    var padL = 4, padR = 48, mainH = wide ? 260 : 200, gap = 26, subH = wide ? 110 : 92, axisH = 20;
    var H = mainH + gap + subH + axisH;
    var v = view(), s = v.s, n = v.end - v.start;
    var slot = (W - padL - padR) / n;
    var bodyW = Math.max(1.5, Math.min(9, slot * 0.62));
    function X(i) { return padL + (i - v.start + 0.5) * slot; }

    // 主圖的上下範圍
    var lo = Infinity, hi = -Infinity;
    for (var i = v.start; i < v.end; i++) {
      lo = Math.min(lo, s.bars[i].l); hi = Math.max(hi, s.bars[i].h);
      var extra = state.main === 'ma' ? MA.map(function (m) { return s.ma[m][i]; }) : [s.boll.up[i], s.boll.dn[i]];
      extra.forEach(function (x) { if (isFinite(x)) { lo = Math.min(lo, x); hi = Math.max(hi, x); } });
    }
    var padY = (hi - lo) * 0.06; lo -= padY; hi += padY;
    function Y(p) { return 8 + (hi - p) / (hi - lo) * (mainH - 16); }

    var svg = node('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' });
    var gMain = node('g', {}, svg);

    niceTicks(lo, hi, 4).forEach(function (t) {
      node('line', { x1: padL, x2: W - padR, y1: Y(t), y2: Y(t), class: 'lab-grid' }, gMain);
      var tx = node('text', { x: W - padR + 6, y: Y(t) + 4, class: 'lab-axis' }, gMain);
      tx.textContent = fmt(t, t >= 100 ? 0 : 1);
    });

    if (state.main === 'boll') {
      var band = '', back = '';
      for (i = v.start; i < v.end; i++) {
        if (!isFinite(s.boll.up[i])) continue;
        band += (band ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(s.boll.up[i]).toFixed(1);
        back = 'L' + X(i).toFixed(1) + ' ' + Y(s.boll.dn[i]).toFixed(1) + back;
      }
      if (band) node('path', { d: band + back + 'Z', class: 'lab-band' }, gMain);
    }

    // K 線：漲的用空心、跌的用實心，色弱的人也分得出來
    for (i = v.start; i < v.end; i++) {
      var b = s.bars[i], up = b.c >= b.o, x = X(i);
      var cls = 'lab-candle ' + (up ? 'is-up' : 'is-down');
      node('line', { x1: x, x2: x, y1: Y(b.h), y2: Y(b.l), class: cls + ' wick' }, gMain);
      var top = Y(Math.max(b.o, b.c)), bot = Y(Math.min(b.o, b.c));
      node('rect', { x: x - bodyW / 2, y: top, width: bodyW, height: Math.max(1, bot - top), class: cls + ' body' }, gMain);
    }

    function line(arr, cls, g, yf) {
      var d = '';
      for (var j = v.start; j < v.end; j++) {
        if (!isFinite(arr[j])) continue;
        d += (d ? 'L' : 'M') + X(j).toFixed(1) + ' ' + yf(arr[j]).toFixed(1);
      }
      if (d) node('path', { d: d, class: 'lab-line ' + cls }, g);
    }
    if (state.main === 'ma') {
      MA.forEach(function (m, k) { line(s.ma[m], 's' + (k + 1), gMain, Y); });
    } else {
      line(s.boll.up, 's3 thin', gMain, Y);
      line(s.boll.mid, 's2', gMain, Y);
      line(s.boll.dn, 's3 thin', gMain, Y);
    }

    // 副圖
    var top0 = mainH + gap, gSub = node('g', {}, svg);
    node('line', { x1: padL, x2: W - padR, y1: top0 - 0.5, y2: top0 - 0.5, class: 'lab-grid' }, gSub);
    var sy;
    if (state.sub === 'vol') {
      var vmax = 0;
      for (i = v.start; i < v.end; i++) vmax = Math.max(vmax, s.bars[i].v);
      sy = function (q) { return top0 + subH - q / vmax * (subH - 6); };
      for (i = v.start; i < v.end; i++) {
        b = s.bars[i];
        node('rect', { x: X(i) - bodyW / 2, y: sy(b.v), width: bodyW, height: Math.max(1, top0 + subH - sy(b.v)), class: 'lab-candle body ' + (b.c >= b.o ? 'is-up' : 'is-down') }, gSub);
      }
      var vt = node('text', { x: W - padR + 6, y: top0 + 12, class: 'lab-axis' }, gSub);
      vt.textContent = fmtVol(vmax);
    } else if (state.sub === 'macd') {
      var m = 0;
      for (i = v.start; i < v.end; i++) [s.macd.dif[i], s.macd.dea[i], s.macd.hist[i]].forEach(function (q) { if (isFinite(q)) m = Math.max(m, Math.abs(q)); });
      m = m || 1;
      sy = function (q) { return top0 + subH / 2 - q / m * (subH / 2 - 6); };
      node('line', { x1: padL, x2: W - padR, y1: sy(0), y2: sy(0), class: 'lab-guide' }, gSub);
      var zt = node('text', { x: W - padR + 6, y: sy(0) + 4, class: 'lab-axis' }, gSub);
      zt.textContent = '0';
      for (i = v.start; i < v.end; i++) {
        var hv = s.macd.hist[i];
        if (!isFinite(hv)) continue;
        var y1 = sy(Math.max(hv, 0)), y2 = sy(Math.min(hv, 0));
        node('rect', { x: X(i) - bodyW / 2, y: y1, width: bodyW, height: Math.max(1, y2 - y1), class: 'lab-candle body ' + (hv >= 0 ? 'is-up' : 'is-down') }, gSub);
      }
      line(s.macd.dif, 's1', gSub, sy);
      line(s.macd.dea, 's2', gSub, sy);
    } else {
      var hiG = state.sub === 'kd' ? 80 : 70, loG = state.sub === 'kd' ? 20 : 30;
      sy = function (q) { return top0 + 4 + (100 - q) / 100 * (subH - 8); };
      [loG, hiG].forEach(function (g) {
        node('line', { x1: padL, x2: W - padR, y1: sy(g), y2: sy(g), class: 'lab-guide' }, gSub);
        var gt = node('text', { x: W - padR + 6, y: sy(g) + 4, class: 'lab-axis' }, gSub);
        gt.textContent = String(g);
      });
      if (state.sub === 'kd') {
        line(s.kd.k, 's1', gSub, sy);
        line(s.kd.d, 's2', gSub, sy);
      } else {
        line(s.rsi[RSI[0]], 's1', gSub, sy);
        line(s.rsi[RSI[1]], 's2', gSub, sy);
      }
    }

    // X 軸：示意資料用「幾天前」標示，避免看起來像真的日期；真實資料標日期
    var gAx = node('g', {}, svg);
    var marks = [v.start, v.start + Math.round(n / 3), v.start + Math.round(2 * n / 3), v.end - 1];
    marks.forEach(function (i2, k) {
      var t = node('text', { x: X(i2), y: H - 4, class: 'lab-axis', 'text-anchor': k === 0 ? 'start' : k === 3 ? 'end' : 'middle' }, gAx);
      t.textContent = axisLabel(i2, v.end);
    });

    // 選取的那一根
    var sel = state.sel;
    var cx = X(sel);
    node('rect', { x: cx - slot / 2, y: 0, width: slot, height: mainH + gap + subH, class: 'lab-sel' }, svg);
    node('line', { x1: cx, x2: cx, y1: 0, y2: mainH + gap + subH, class: 'lab-cross' }, svg);
    var cy = Y(s.bars[sel].c);
    node('line', { x1: padL, x2: W - padR, y1: cy, y2: cy, class: 'lab-cross' }, svg);
    var tagW = padR - 2;
    node('rect', { x: W - padR + 1, y: cy - 9, width: tagW, height: 18, rx: 3, class: 'lab-tag' }, svg);
    var tt = node('text', { x: W - padR + 5, y: cy + 4, class: 'lab-tag-text' }, svg);
    tt.textContent = fmt(s.bars[sel].c, s.bars[sel].c >= 100 ? 1 : 2);

    box.textContent = '';
    box.appendChild(svg);
    geom = { W: W, padL: padL, slot: slot, start: v.start, end: v.end };

    legends();
    read();
  }

  // 圖上方的數值列（跟看盤 App 一樣，數值跟著選取的那一根變）
  function legendRow(id, items) {
    var row = el(id);
    row.textContent = '';
    items.forEach(function (it) {
      var span = document.createElement('span');
      span.className = 'lab-key';
      var mark = document.createElement('i');
      mark.className = 'lab-swatch ' + it.cls;
      mark.setAttribute('aria-hidden', 'true');
      var name = document.createElement('span');
      name.className = 'lab-key-name';
      name.textContent = it.name;
      var val = document.createElement('b');
      val.textContent = it.value;
      span.appendChild(mark); span.appendChild(name); span.appendChild(val);
      row.appendChild(span);
    });
  }

  function legends() {
    var s = data[state.period], i = state.sel, u = state.period === 'day' ? '' : '（週）';
    if (state.main === 'ma') {
      legendRow('lab-legend-main', MA.map(function (m, k) { return { cls: 's' + (k + 1), name: 'MA' + m + u, value: fmt(s.ma[m][i]) }; }));
    } else {
      legendRow('lab-legend-main', [
        { cls: 's3', name: '上軌', value: fmt(s.boll.up[i]) },
        { cls: 's2', name: '中軌 MA20', value: fmt(s.boll.mid[i]) },
        { cls: 's3', name: '下軌', value: fmt(s.boll.dn[i]) }
      ]);
    }
    var b = s.bars[i], items;
    if (state.sub === 'vol') items = [{ cls: 'vol', name: '成交量', value: fmtVol(b.v) }, { cls: 'none', name: '5' + unit() + '均量', value: fmtVol(s.vma[i]) }];
    else if (state.sub === 'macd') items = [{ cls: 's1', name: 'DIF', value: fmt(s.macd.dif[i]) }, { cls: 's2', name: 'DEA', value: fmt(s.macd.dea[i]) }, { cls: 'vol', name: '柱', value: fmt(s.macd.hist[i]) }];
    else if (state.sub === 'kd') items = [{ cls: 's1', name: 'K', value: fmt(s.kd.k[i], 1) }, { cls: 's2', name: 'D', value: fmt(s.kd.d[i], 1) }];
    else items = RSI.map(function (n, k) { return { cls: 's' + (k + 1), name: 'RSI' + n, value: fmt(s.rsi[n][i], 1) }; });
    legendRow('lab-legend-sub', items);
  }

  // ---------- 白話判讀 ----------

  function crossed(a, b, i, dir) {
    if (i < 1 || !isFinite(a[i - 1]) || !isFinite(b[i - 1])) return false;
    return dir > 0 ? a[i - 1] <= b[i - 1] && a[i] > b[i] : a[i - 1] >= b[i - 1] && a[i] < b[i];
  }

  function readings(i) {
    var s = data[state.period], b = s.bars[i], prev = i > 0 ? s.bars[i - 1] : null, u = unit();
    var upWord = state.color === 'tw' ? '紅' : '綠', downWord = state.color === 'tw' ? '綠' : '紅';
    var out = [];

    // K 線
    var body = Math.abs(b.c - b.o), range = b.h - b.l || 1;
    var upper = b.h - Math.max(b.o, b.c), lower = Math.min(b.o, b.c) - b.l;
    var t = '開 ' + fmt(b.o) + '、高 ' + fmt(b.h) + '、低 ' + fmt(b.l) + '、收 ' + fmt(b.c) + '。';
    if (prev) {
      var ch = b.c - prev.c;
      t += '比前一' + u + '收盤' + (ch >= 0 ? '漲 ' : '跌 ') + fmt(Math.abs(ch)) + '（' + (ch >= 0 ? '+' : '−') + fmt(Math.abs(ch) / prev.c * 100, 1) + '%）。';
    }
    t += b.c >= b.o ? '收比開高，是一根' + upWord + ' K（空心）。' : '收比開低，是一根' + downWord + ' K（實心）。';
    if (body < range * 0.12) t += '實體很小，接近十字線：買賣雙方拉鋸，方向還沒決定。';
    else if (upper > body * 1.5 && upper > range * 0.4) t += '上影線很長：盤中衝高，但被賣了回來。';
    else if (lower > body * 1.5 && lower > range * 0.4) t += '下影線很長：盤中跌深，但被買了回來。';
    out.push({ k: 'K 線', t: t });

    // 均線或布林
    if (state.main === 'ma') {
      var m5 = s.ma[5][i], m20 = s.ma[20][i], m60 = s.ma[60][i];
      if (isFinite(m60)) {
        t = '收盤在 MA20 ' + (b.c >= m20 ? '之上' : '之下') + '、MA60 ' + (b.c >= m60 ? '之上' : '之下') + '。';
        if (m5 > m20 && m20 > m60) t += '短的在上、長的在下（MA5 > MA20 > MA60），叫多頭排列，趨勢偏多。';
        else if (m5 < m20 && m20 < m60) t += '短的在下、長的在上（MA5 < MA20 < MA60），叫空頭排列，趨勢偏空。';
        else t += '三條均線交錯，趨勢不明，常見於盤整或轉折的時候。';
        var m20p = s.ma[20][i - 5];
        if (isFinite(m20p)) {
          var slope = (m20 - m20p) / m20p;
          t += slope > 0.005 ? 'MA20 往上彎。' : slope < -0.005 ? 'MA20 往下彎。' : 'MA20 走平。';
        }
        if (state.period === 'week') t += '注意：週 K 上的 MA5 是最近 5 週的平均，不是 5 天。';
      } else {
        t = '這裡的資料還不夠長，MA60 要有 60 ' + u + '的收盤價才算得出來。';
      }
      out.push({ k: '均線', t: t });
    } else {
      var bu = s.boll.up[i], bd = s.boll.dn[i];
      if (isFinite(bu)) {
        var pos = (b.c - bd) / (bu - bd);
        t = pos > 1 ? '收盤衝出上軌：漲得很急，短線偏熱，但強勢股也可能沿著上軌一直走。'
          : pos > 0.8 ? '收盤靠近上軌：在通道的偏高位置。'
          : pos < 0 ? '收盤跌破下軌：跌得很急，短線偏冷。'
          : pos < 0.2 ? '收盤靠近下軌：在通道的偏低位置。'
          : '收盤在通道中間附近。';
        var width = (bu - bd) / s.boll.mid[i], wsum = 0, wn = 0;
        for (var j = Math.max(19, i - 60); j < i; j++) { wsum += (s.boll.up[j] - s.boll.dn[j]) / s.boll.mid[j]; wn++; }
        if (wn > 10) {
          var ratio = width / (wsum / wn);
          if (ratio < 0.7) t += '通道比平常窄很多（收斂）：波動變小，常出現在盤整、等待方向的時候。';
          else if (ratio > 1.3) t += '通道比平常寬（張開）：波動變大了。';
        }
      } else {
        t = '資料還不夠 20 ' + u + '，布林通道還算不出來。';
      }
      out.push({ k: '布林通道', t: t });
    }

    // 成交量
    var avg = i >= 5 ? s.vma[i - 1] : NaN;
    if (isFinite(avg)) {
      var r = b.v / avg, up = prev ? b.c >= prev.c : b.c >= b.o;
      t = '成交量是前 5 ' + u + '平均的 ' + fmt(r, 1) + ' 倍。';
      if (r >= 1.8) t += up ? '價漲又爆量：很多人搶著買。' : '價跌又爆量：很多人搶著賣，賣壓重。';
      else if (r >= 1.25) t += up ? '價漲量增，漲得比較有力。' : '價跌量增，賣壓偏重。';
      else if (r <= 0.75) t += up ? '價漲量縮：漲，但跟的人變少。' : '價跌量縮：跌，但賣的人也變少。';
      else t += '量跟平常差不多。';
      out.push({ k: '成交量', t: t });
    }

    // MACD
    var dif = s.macd.dif[i], dea = s.macd.dea[i];
    if (isFinite(dif)) {
      t = 'DIF ' + (dif >= dea ? '在 DEA 之上' : '在 DEA 之下') + '，柱子' + (dif >= dea ? '在零軸上方' : '在零軸下方') + '。';
      if (crossed(s.macd.dif, s.macd.dea, i, 1)) t += '這一根 DIF 剛往上穿過 DEA，叫黃金交叉：上漲的力道開始贏過下跌。';
      else if (crossed(s.macd.dif, s.macd.dea, i, -1)) t += '這一根 DIF 剛往下穿過 DEA，叫死亡交叉：下跌的力道開始贏過上漲。';
      var hp = s.macd.hist[i - 1];
      if (isFinite(hp)) t += Math.abs(s.macd.hist[i]) > Math.abs(hp) ? '柱子變長，目前的方向在加速。' : '柱子變短，目前的方向在減速。';
      t += dif >= 0 ? 'DIF 在零軸之上，中期偏多。' : 'DIF 在零軸之下，中期偏空。';
      out.push({ k: 'MACD', t: t });
    }

    // KD
    var K = s.kd.k, D = s.kd.d;
    if (isFinite(K[i])) {
      t = 'K ' + fmt(K[i], 0) + '、D ' + fmt(D[i], 0) + '。';
      if (K[i] >= 80) t += '在 80 以上的高檔：收盤一直靠近最近 9 ' + u + '的最高點，短線偏熱。';
      else if (K[i] <= 20) t += '在 20 以下的低檔：收盤一直靠近最近 9 ' + u + '的最低點，短線偏冷。';
      else t += '在中間區域。';
      var hot = 0, cold = 0;
      for (var q = i; q > i - 3 && q >= 0; q--) { if (K[q] >= 80) hot++; if (K[q] <= 20) cold++; }
      if (hot === 3) t += '已經連續 3 ' + u + '在 80 以上，叫高檔鈍化：強勢的時候常見，不能只因為「太高」就賣。';
      if (cold === 3) t += '已經連續 3 ' + u + '在 20 以下，叫低檔鈍化：弱勢的時候常見，不能只因為「很低」就買。';
      if (crossed(K, D, i, 1)) t += 'K 剛往上穿過 D（黃金交叉）。';
      else if (crossed(K, D, i, -1)) t += 'K 剛往下穿過 D（死亡交叉）。';
      out.push({ k: 'KD', t: t });
    }

    // RSI
    var rs = s.rsi[RSI[0]][i], rl = s.rsi[RSI[1]][i];
    if (isFinite(rl)) {
      t = 'RSI' + RSI[0] + ' 是 ' + fmt(rs, 0) + '、RSI' + RSI[1] + ' 是 ' + fmt(rl, 0) + '。';
      if (rl >= 70) t += '70 以上：最近漲的力道遠大於跌，偏熱（常說的超買）。';
      else if (rl <= 30) t += '30 以下：最近跌的力道遠大於漲，偏冷（常說的超賣）。';
      else t += '在 30～70 之間，不算過熱也不算過冷。';
      out.push({ k: 'RSI', t: t });
    }
    return out;
  }

  function read() {
    var v = view(), list = readings(state.sel);
    var box = el('lab-read');
    box.textContent = '';
    var h = document.createElement('p');
    h.className = 'lab-read-head';
    h.textContent = '你選的是：' + ago(state.sel, v.end) + (state.period === 'day' ? '（日 K，一根＝一天）' : '（週 K，一根＝一週）');
    box.appendChild(h);
    var dl = document.createElement('dl');
    list.forEach(function (it) {
      var dt = document.createElement('dt'); dt.textContent = it.k;
      var dd = document.createElement('dd'); dd.textContent = it.t;
      dl.appendChild(dt); dl.appendChild(dd);
    });
    box.appendChild(dl);
    var note = document.createElement('p');
    note.className = 'lab-read-note';
    note.textContent = '以上全部是用「過去的價格和成交量」算出來的，只能描述現在的狀態，不能保證下一根怎麼走。';
    box.appendChild(note);
    el('lab-chart').setAttribute('aria-label', (external ? label + (state.period === 'day' ? ' 日' : ' 週') + ' K 線圖。' : '示意 K 線圖。') + h.textContent + '。用左右方向鍵換一根，判讀寫在圖下方。');
  }

  // ---------- 「找一天」按鈕 ----------

  var FINDERS = {
    hot: { sub: 'rsi', label: 'RSI 最熱的一' },
    cold: { sub: 'rsi', label: 'RSI 最冷的一' },
    gold: { sub: 'macd', label: '最近一次 MACD 黃金交叉' },
    death: { sub: 'kd', label: '最近一次 KD 死亡交叉' },
    volume: { sub: 'vol', label: '最大量的一' },
    breakdown: { main: 'ma', label: '最近一次跌破 MA20' }
  };

  function find(kind) {
    var v = view(), s = v.s, best = -1, score = -Infinity;
    var closes = s.bars.map(function (b) { return b.c; });
    for (var i = v.end - 1; i >= v.start; i--) {
      var x;
      if (kind === 'hot') x = s.rsi[RSI[1]][i];
      else if (kind === 'cold') x = -s.rsi[RSI[1]][i];
      else if (kind === 'volume') x = isFinite(s.vma[i - 1]) ? s.bars[i].v / s.vma[i - 1] : NaN;
      else if (kind === 'gold') { if (crossed(s.macd.dif, s.macd.dea, i, 1)) return i; continue; }
      else if (kind === 'death') { if (crossed(s.kd.k, s.kd.d, i, -1)) return i; continue; }
      else if (kind === 'breakdown') { if (crossed(closes, s.ma[20], i, -1)) return i; continue; }
      if (isFinite(x) && x > score) { score = x; best = i; }
    }
    return best;
  }

  function onFind(e) {
    var btn = e.target.closest('[data-find]');
    if (!btn) return;
    var kind = btn.getAttribute('data-find'), f = FINDERS[kind];
    var i = find(kind);
    var msg = el('lab-find-msg');
    if (i < 0) { msg.textContent = external ? '圖上這段時間裡沒有出現。' : '這段走勢裡沒有找到，按「換一組走勢」再試試。'; return; }
    if (f.sub) setRadio('lab-sub', f.sub);
    if (f.main) setRadio('lab-main', f.main);
    state.sel = i;
    msg.textContent = '已選到：' + f.label.replace(/一$/, '一' + unit()) + '，' + ago(i, view().end) + '。';
    render();
  }

  function setRadio(name, value) {
    var r = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (r) r.checked = true;
    state[name.replace('lab-', '')] = value;
  }

  // ---------- 控制項 ----------

  function onControl(e) {
    var t = e.target;
    if (!t.name || t.name.indexOf('lab-') !== 0) return;
    var key = t.name.replace('lab-', '');
    state[key] = t.value;
    if (key === 'period') state.sel = data[state.period].bars.length - 1;
    if (key === 'color') root.classList.toggle('is-us', t.value === 'us');
    el('lab-find-msg').textContent = '';
    render();
  }

  function onPointer(e) {
    if (!geom || (e.type === 'pointermove' && e.pointerType !== 'mouse' && !e.buttons)) return;
    var rect = el('lab-chart').getBoundingClientRect();
    var px = (e.clientX - rect.left) * (geom.W / rect.width);
    var idx = Math.floor((px - geom.padL) / geom.slot) + geom.start;
    idx = Math.max(geom.start, Math.min(geom.end - 1, idx));
    if (idx !== state.sel) { state.sel = idx; render(); }
  }

  function onKey(e) {
    var v = view(), i = state.sel;
    if (e.key === 'ArrowLeft') i--;
    else if (e.key === 'ArrowRight') i++;
    else if (e.key === 'Home') i = v.start;
    else if (e.key === 'End') i = v.end - 1;
    else return;
    e.preventDefault();
    state.sel = Math.max(v.start, Math.min(v.end - 1, i));
    render();
  }

  function regenerate() {
    state.seed = (state.seed * 1103515245 + 12345 + Date.now()) >>> 0;
    build();
    state.sel = data[state.period].bars.length - 1;
    el('lab-find-msg').textContent = '換了一組新的示意走勢。';
    render();
  }

  // 美股日報換股票時呼叫：bars 是日 K（每根有 d 日期），name 是圖的名稱
  function load(bars, name) {
    data = { day: series(bars), week: series(weeklyByDate(bars)) };
    label = name || '';
    state.sel = data[state.period].bars.length - 1;
    el('lab-find-msg').textContent = '';
    render();
  }
  window.StockChart.load = load;

  function init() {
    root.addEventListener('change', onControl);
    el('lab-find').addEventListener('click', onFind);
    el('lab-chart').addEventListener('keydown', onKey);
    el('lab-chart').addEventListener('pointerdown', onPointer);
    el('lab-chart').addEventListener('pointermove', onPointer);
    if (el('lab-new')) el('lab-new').addEventListener('click', regenerate);
    var timer;
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(function () { if (data) render(); }, 120); });
    if (external) return;
    build();
    state.sel = data.day.bars.length - 1;
    render();
  }

  init();
})();
