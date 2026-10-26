/* 台股入門 60 天 — 趨勢日報的計算（不碰畫面）
   網頁的 trend.js 和每天更新用的 tools/trend-daily.js 都用這個檔案，兩邊算出來的數字才會一樣。
   要先載入 js/chart.js：均線、MACD、KD、RSI、布林的公式在那裡。 */
(function (root) {
  'use strict';

  var C = root.StockChart;

  // 追蹤的股票：第一檔是大盤代表
  var SYMBOLS = [
    { id: 'SPY', name: '標普 500', note: '用 SPY 代表：追蹤標普 500 指數的 ETF' },
    { id: 'TSLA', name: '特斯拉' },
    { id: 'GOOG', name: 'Alphabet（Google）' },
    { id: 'NVDA', name: '輝達' },
    { id: 'AAPL', name: '蘋果' },
    { id: 'COST', name: '好市多' }
  ];
  var BENCH = 'SPY';

  // 「漲、跌、盤整」怎麼算：5 個交易日漲跌超過 ±2%，20 個交易日超過 ±5%，其餘算盤整
  var BAND = { 5: 2, 20: 5 };

  function symbol(id) {
    for (var i = 0; i < SYMBOLS.length; i++) if (SYMBOLS[i].id === id) return SYMBOLS[i];
    return null;
  }

  // 把各個資料檔 push 進來的日 K 合併：同一天以後面的檔案為準，依日期排序
  function collect(win) {
    var map = {};
    (win.US_BARS || []).forEach(function (chunk) {
      Object.keys(chunk).forEach(function (id) {
        var m = map[id] || (map[id] = {});
        chunk[id].forEach(function (r) { m[r[0]] = { d: r[0], o: r[1], h: r[2], l: r[3], c: r[4], v: r[5] }; });
      });
    });
    var out = {};
    Object.keys(map).forEach(function (id) {
      out[id] = Object.keys(map[id]).sort().map(function (d) { return map[id][d]; });
    });
    return out;
  }

  function pct(a, b) { return (a / b - 1) * 100; }
  function round(x, d) { var k = Math.pow(10, d === undefined ? 2 : d); return Math.round(x * k) / k; }

  // 轉折點：比前後各 k 根都高（低）的那一根，拿來當壓力（支撐）的參考
  function pivots(bars, k, look) {
    var hi = [], lo = [], start = Math.max(k, bars.length - look);
    for (var i = start; i < bars.length - k; i++) {
      var isHi = true, isLo = true;
      for (var j = i - k; j <= i + k; j++) {
        if (j === i) continue;
        if (bars[j].h >= bars[i].h) isHi = false;
        if (bars[j].l <= bars[i].l) isLo = false;
      }
      if (isHi) hi.push({ p: bars[i].h, d: bars[i].d });
      if (isLo) lo.push({ p: bars[i].l, d: bars[i].d });
    }
    return { hi: hi, lo: lo };
  }

  function lastCross(a, b, i, within) {
    for (var j = i; j > i - within && j > 0; j--) {
      if (!isFinite(a[j - 1]) || !isFinite(b[j - 1])) break;
      if (a[j - 1] <= b[j - 1] && a[j] > b[j]) return { type: 'gold', ago: i - j };
      if (a[j - 1] >= b[j - 1] && a[j] < b[j]) return { type: 'death', ago: i - j };
    }
    return null;
  }

  // 一檔股票的「體檢表」：全部用最後一根 K 線當基準
  function analyze(bars) {
    var s = C.series(bars), i = bars.length - 1, b = bars[i];
    var c = bars.map(function (x) { return x.c; });
    function chg(k) { return i - k >= 0 ? pct(b.c, c[i - k]) : NaN; }
    var ma5 = s.ma[5][i], ma20 = s.ma[20][i], ma60 = s.ma[60][i];
    var ma20s = pct(ma20, s.ma[20][i - 5]), ma60s = pct(ma60, s.ma[60][i - 10]);

    // 中期趨勢看 MA60 的位置和方向，短線看收盤在 MA20 的上面還是下面
    var trend = b.c > ma60 && ma20 > ma60 && ma60s > 0 ? 'up'
      : b.c < ma60 && ma20 < ma60 && ma60s < 0 ? 'down' : 'range';
    var order = ma5 > ma20 && ma20 > ma60 ? 'bull' : ma5 < ma20 && ma20 < ma60 ? 'bear' : 'mixed';

    var y = bars.slice(-252), hi52 = -Infinity, lo52 = Infinity, hi52d = '', lo52d = '';
    y.forEach(function (x) {
      if (x.h > hi52) { hi52 = x.h; hi52d = x.d; }
      if (x.l < lo52) { lo52 = x.l; lo52d = x.d; }
    });

    // 波動：最近 20 天每日漲跌幅的標準差，換算成一年
    var rets = [];
    for (var k = Math.max(1, i - 19); k <= i; k++) rets.push(Math.log(c[k] / c[k - 1]));
    var mean = rets.reduce(function (a, x) { return a + x; }, 0) / rets.length;
    var sd = Math.sqrt(rets.reduce(function (a, x) { return a + (x - mean) * (x - mean); }, 0) / (rets.length - 1));

    var w = C.weeklyByDate(bars), ws = C.series(w), wi = w.length - 1;
    var bu = s.boll.up[i], bd = s.boll.dn[i];

    var h = {
      date: b.d, close: b.c, open: b.o, high: b.h, low: b.l, volume: b.v,
      chg1: chg(1), chg5: chg(5), chg20: chg(20), chg60: chg(60),
      ma5: ma5, ma20: ma20, ma60: ma60, ma20slope: ma20s, ma60slope: ma60s,
      vsMa20: pct(b.c, ma20), vsMa60: pct(b.c, ma60),
      trend: trend, order: order,
      rsi6: s.rsi[6][i], rsi12: s.rsi[12][i], k: s.kd.k[i], d: s.kd.d[i],
      dif: s.macd.dif[i], dea: s.macd.dea[i], hist: s.macd.hist[i],
      macdCross: lastCross(s.macd.dif, s.macd.dea, i, 20),
      bollUp: bu, bollMid: s.boll.mid[i], bollDn: bd, bollPos: (b.c - bd) / (bu - bd),
      volRatio: b.v / s.vma[i - 1],
      hi52: hi52, hi52d: hi52d, lo52: lo52, lo52d: lo52d, fromHi52: pct(b.c, hi52),
      vol20: sd * Math.sqrt(252) * 100,
      weekly: { date: w[wi].d, close: w[wi].c, ma5: ws.ma[5][wi], ma20: ws.ma[20][wi], vsMa20: pct(w[wi].c, ws.ma[20][wi]) },
      levels: levels(bars, b.c, ma20, ma60)
    };
    return h;
  }

  // 附近的支撐和壓力：近半年的轉折點，加上 MA20、MA60；各取離現價最近的兩個
  function levels(bars, close, ma20, ma60) {
    var pv = pivots(bars, 5, 130), sup = [], res = [];
    pv.hi.forEach(function (x) { (x.p > close ? res : sup).push({ p: x.p, why: x.d + ' 的高點' }); });
    pv.lo.forEach(function (x) { (x.p < close ? sup : res).push({ p: x.p, why: x.d + ' 的低點' }); });
    [[ma20, 'MA20'], [ma60, 'MA60']].forEach(function (m) {
      if (isFinite(m[0])) (m[0] < close ? sup : res).push({ p: m[0], why: m[1] });
    });
    function near(list, dir) {
      list.sort(function (a, b) { return dir * (a.p - b.p); });
      var out = [];
      list.forEach(function (x) {
        // 太接近的（相差不到 1%）只留一個，免得列出一堆差不多的價錢
        if (out.length < 2 && !out.some(function (o) { return Math.abs(o.p / x.p - 1) < 0.01; })) out.push(x);
      });
      return out;
    }
    return { sup: near(sup, -1), res: near(res, 1) };
  }

  // 從 baseDate 那根收盤算起，過 horizon 個交易日之後漲跌多少
  function outcome(bars, baseDate, horizon) {
    var bi = -1;
    for (var i = 0; i < bars.length; i++) if (bars[i].d === baseDate) { bi = i; break; }
    if (bi < 0) return { done: false, missing: true };
    var ei = bi + horizon;
    if (ei >= bars.length) return { done: false, left: ei - bars.length + 1 };
    var ret = pct(bars[ei].c, bars[bi].c), band = BAND[horizon] || 2;
    var lo = Infinity, hi = -Infinity;
    for (i = bi + 1; i <= ei; i++) { lo = Math.min(lo, bars[i].l); hi = Math.max(hi, bars[i].h); }
    return { done: true, ret: ret, dir: ret > band ? 'up' : ret < -band ? 'down' : 'flat', end: bars[ei].d, endClose: bars[ei].c, low: lo, high: hi };
  }

  // 基準率：過去每一段 horizon 天，漲、跌、盤整各占幾 %
  function baseRates(bars, horizon) {
    var n = 0, up = 0, down = 0, band = BAND[horizon] || 2;
    for (var i = 0; i + horizon < bars.length; i++) {
      var r = pct(bars[i + horizon].c, bars[i].c);
      n++;
      if (r > band) up++; else if (r < -band) down++;
    }
    return { n: n, up: up / n * 100, down: down / n * 100, flat: (n - up - down) / n * 100 };
  }

  var WORD = {
    trend: { up: '上升趨勢', down: '下降趨勢', range: '盤整／方向不明' },
    dir: { up: '漲', down: '跌', flat: '盤整' }
  };

  root.TrendCore = {
    SYMBOLS: SYMBOLS, BENCH: BENCH, BAND: BAND, WORD: WORD,
    symbol: symbol, collect: collect, analyze: analyze, pivots: pivots, levels: levels,
    outcome: outcome, baseRates: baseRates, pct: pct, round: round
  };
})(typeof window !== 'undefined' ? window : this);
