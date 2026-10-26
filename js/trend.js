/* 台股入門 60 天 — 美股趨勢日報
   讀 data/us/ 的日 K 和每天早上寫的日報，用指標實驗室畫真的 K 線，
   每檔自動算一張「體檢表」，再加上預測日記：記下自己的預測，時間到了自動對答案。 */
(function () {
  'use strict';

  var T = window.TrendCore, C = window.StockChart, IDX = window.US_INDEX;
  var BASE = 'data/us/';
  var KEY = 'tw-stock-30-forecasts';
  var state = { sym: T.BENCH, bars: {}, report: null, reportDate: '', calls: [] };

  function el(id) { return document.getElementById(id); }
  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function num(x, d) {
    if (!isFinite(x)) return '—';
    return x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function price(x) { return num(x, 2); }
  // 先四捨五入再決定正負號和顏色，免得 +0.0% 被標成紅色
  function signed(x, d) {
    if (!isFinite(x)) return '—';
    var k = Math.pow(10, d === undefined ? 1 : d), r = Math.round(x * k) / k;
    return (r > 0 ? '+' : r < 0 ? '−' : '') + num(Math.abs(r), d === undefined ? 1 : d) + '%';
  }
  function tone(x) { var r = Math.round(x * 10) / 10; return r > 0 ? 'up' : r < 0 ? 'down' : ''; }
  function changeSpan(x) { return make('span', tone(x), signed(x)); }
  function md(d) { return +d.slice(5, 7) + '/' + +d.slice(8, 10); }
  function dayLabel(d) {
    var w = '日一二三四五六'[new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).getUTCDay()];
    return md(d) + '（' + w + '）';
  }
  function name(id) { var s = T.symbol(id); return s ? s.name : id; }

  function store(value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(KEY) || '[]');
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch (e) { return []; }
    return value;
  }

  // ---------- 載入資料檔 ----------

  function loadScripts(list, done) {
    var left = list.length, failed = [];
    if (!left) { done(failed); return; }
    list.forEach(function (src) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { if (--left === 0) done(failed); };
      s.onerror = function () { failed.push(src); if (--left === 0) done(failed); };
      document.body.appendChild(s);
    });
  }

  function showError(text) {
    var box = el('tr-error');
    box.hidden = false;
    box.textContent = text;
  }

  // ---------- 今天的日報 ----------

  function list(items, cls) {
    var ul = make('ul', cls);
    items.forEach(function (t) { ul.appendChild(make('li', null, t)); });
    return ul;
  }

  function renderToday() {
    var box = el('tr-today'), r = state.report;
    box.textContent = '';
    if (!r) {
      box.appendChild(make('p', 'notice', '今天的日報還沒寫好。下面的圖和體檢表是用最新的收盤資料自動算的，一樣可以看。'));
      return;
    }
    var latest = IDX.reports[IDX.reports.length - 1];
    if (r.date !== latest) {
      var old = make('p', 'notice');
      old.appendChild(document.createTextNode('你在看 ' + dayLabel(r.date) + ' 的舊日報。圖和體檢表還是用最新資料。'));
      var a = make('a', null, '回到最新一期');
      a.href = 'trend.html';
      old.appendChild(a);
      box.appendChild(old);
    }
    box.appendChild(make('p', 'tr-date', '台灣 ' + dayLabel(r.date) + '早上寫・用美股 ' + dayLabel(r.bars) + '的收盤'));
    box.appendChild(make('h3', 'tr-title', r.title));
    box.appendChild(list(r.market, 'tr-market'));

    if (r.check && r.check.length) {
      box.appendChild(make('h4', 'tr-h4', '上一期說的，結果呢？'));
      box.appendChild(list(r.check));
    }
    if (r.events && r.events.length) {
      box.appendChild(make('h4', 'tr-h4', '接下來的大事'));
      var ev = make('ul', 'tr-events');
      r.events.forEach(function (e) {
        var li = make('li');
        li.appendChild(make('b', null, e.when));
        li.appendChild(document.createTextNode(e.what));
        ev.appendChild(li);
      });
      box.appendChild(ev);
    }
    if (r.tip) {
      var tip = make('div', 'tr-tip');
      tip.appendChild(make('p', 'tr-tip-label', '今天學一招' + (r.tip.no ? '（第 ' + r.tip.no + ' 招）' : '')));
      tip.appendChild(make('h4', null, r.tip.title));
      r.tip.body.forEach(function (t) { tip.appendChild(make('p', null, t)); });
      box.appendChild(tip);
    }
    if (r.sources && r.sources.length) {
      var src = make('div', 'sources');
      src.appendChild(make('p', 'sources-title', '這期日報的資料來源'));
      var ul = make('ul');
      r.sources.forEach(function (s) {
        var li = make('li', null, s.text + '　');
        if (s.url) {
          var a = make('a', null, '開啟來源');
          a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
          li.appendChild(a);
        }
        ul.appendChild(li);
      });
      src.appendChild(ul);
      box.appendChild(src);
    }
  }

  // ---------- 六檔總覽 ----------

  function renderBoard() {
    var box = el('tr-board');
    box.textContent = '';
    T.SYMBOLS.forEach(function (s) {
      var bars = state.bars[s.id];
      if (!bars) return;
      var a = T.analyze(bars);
      var card = make('button', 'tr-card');
      card.type = 'button';
      card.setAttribute('data-sym', s.id);
      var head = make('span', 'tr-card-head');
      head.appendChild(make('b', null, s.name));
      head.appendChild(make('span', 'ticker', s.id));
      card.appendChild(head);
      var p = make('span', 'tr-card-price', price(a.close) + ' ');
      p.appendChild(changeSpan(a.chg1));
      card.appendChild(p);
      card.appendChild(make('span', 'tr-badge is-' + a.trend, T.WORD.trend[a.trend]));
      var line = make('span', 'tr-card-line');
      line.appendChild(document.createTextNode('20 天 '));
      line.appendChild(changeSpan(a.chg20));
      line.appendChild(document.createTextNode('｜距 52 週高點 '));
      line.appendChild(changeSpan(a.fromHi52));
      card.appendChild(line);
      var st = state.report && state.report.stocks[s.id];
      if (st) card.appendChild(make('span', 'tr-card-note', st.head));
      card.addEventListener('click', function () {
        selectSymbol(s.id);
        el('lab').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      box.appendChild(card);
    });
    el('tr-asof').textContent = '收盤資料到美股 ' + dayLabel(lastDate()) + '，美東時間。';
  }

  function lastDate() {
    var d = '';
    T.SYMBOLS.forEach(function (s) { var b = state.bars[s.id]; if (b && b[b.length - 1].d > d) d = b[b.length - 1].d; });
    return d;
  }

  // ---------- 看圖：選股票、Claude 的解讀、體檢表 ----------

  function renderSymbolPicker() {
    var box = el('tr-syms');
    box.textContent = '';
    var legend = make('legend', null, '股票');
    box.appendChild(legend);
    T.SYMBOLS.forEach(function (s) {
      var label = make('label');
      var input = make('input');
      input.type = 'radio';
      input.name = 'tr-sym';
      input.value = s.id;
      input.checked = s.id === state.sym;
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + s.id));
      box.appendChild(label);
    });
    box.addEventListener('change', function (e) {
      if (e.target.name === 'tr-sym') selectSymbol(e.target.value);
    });
  }

  function selectSymbol(id) {
    state.sym = id;
    var r = document.querySelector('input[name="tr-sym"][value="' + id + '"]');
    if (r) r.checked = true;
    var s = T.symbol(id);
    el('tr-lab-name').textContent = s.name + '（' + s.id + '）' + (s.note ? '：' + s.note : '');
    C.load(state.bars[id], id + ' ' + s.name);
    renderNote(id);
    renderHealth(id);
  }

  function renderNote(id) {
    var box = el('tr-note'), st = state.report && state.report.stocks[id];
    box.textContent = '';
    if (!st) { box.hidden = true; return; }
    box.hidden = false;
    box.appendChild(make('h3', null, 'Claude 怎麼看 ' + id));
    box.appendChild(make('p', 'tr-date', '用美股 ' + dayLabel(state.report.bars) + '的收盤，台灣 ' + dayLabel(state.report.date) + '早上寫'));
    box.appendChild(make('p', 'tr-note-head', st.head));
    box.appendChild(list(st.points));
    if (st.plan && st.plan.length) {
      box.appendChild(make('h4', 'tr-h4', '接下來的情境'));
      var ul = make('ul', 'tr-plan');
      st.plan.forEach(function (p) {
        var li = make('li');
        li.appendChild(make('b', null, '如果' + p.if));
        li.appendChild(document.createTextNode('→ ' + p.then));
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    if (st.call) {
      var call = make('p', 'tr-call');
      call.appendChild(make('b', null, '練習預測：'));
      call.appendChild(document.createTextNode('未來 5 個交易日「' + T.WORD.dir[st.call.dir] + '」，把握 ' + st.call.conf + '%。'));
      if (st.call.why) call.appendChild(document.createTextNode(st.call.why));
      box.appendChild(call);
    }
    if (st.watch) {
      var w = make('p', 'tr-watch');
      w.appendChild(make('b', null, '要注意：'));
      w.appendChild(document.createTextNode(st.watch));
      box.appendChild(w);
    }
  }

  function row(tbody, k, v, note) {
    var tr = make('tr');
    tr.appendChild(make('th', null, k));
    var td = make('td');
    if (typeof v === 'string') td.textContent = v; else td.appendChild(v);
    if (note) td.appendChild(make('span', 'tr-why', note));
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  function frag(parts) {
    var f = document.createDocumentFragment();
    parts.forEach(function (p) { f.appendChild(typeof p === 'string' ? document.createTextNode(p) : p); });
    return f;
  }

  function renderHealth(id) {
    var a = T.analyze(state.bars[id]), box = el('tr-health');
    box.textContent = '';
    box.appendChild(make('h3', null, id + ' 體檢表'));
    box.appendChild(make('p', 'tr-date', dayLabel(a.date) + '收盤・電腦照固定規則自動算'));
    var table = make('table', 'tool-table tr-health-table'), tb = make('tbody');
    var slope = function (x) { return x > 0.3 ? '往上' : x < -0.3 ? '往下' : '走平'; };

    row(tb, '中期趨勢', make('b', 'tr-badge is-' + a.trend, T.WORD.trend[a.trend]),
      '收盤在 MA60（' + price(a.ma60) + '）' + (a.vsMa60 >= 0 ? '之上 ' : '之下 ') + signed(a.vsMa60) + '，MA60 ' + slope(a.ma60slope) + '。規則：收盤和 MA20 都在 MA60 之上、MA60 往上，才算上升趨勢；反過來是下降趨勢；其他都算盤整。');
    row(tb, '短線', a.vsMa20 >= 0 ? '在 MA20 之上' : '在 MA20 之下',
      'MA20 是 ' + price(a.ma20) + '，收盤離它 ' + signed(a.vsMa20) + '；MA20 這 5 天' + slope(a.ma20slope) + '。');
    row(tb, '均線排列', a.order === 'bull' ? '多頭排列' : a.order === 'bear' ? '空頭排列' : '交錯',
      'MA5 ' + price(a.ma5) + '、MA20 ' + price(a.ma20) + '、MA60 ' + price(a.ma60) + '。' + (a.order === 'bull' ? '短的在上、長的在下。' : a.order === 'bear' ? '短的在下、長的在上。' : '三條線糾在一起，方向還沒出來。'));
    var cross = a.macdCross ? (a.macdCross.ago === 0 ? '今天' : a.macdCross.ago + ' 個交易日前') + '出現' + (a.macdCross.type === 'gold' ? '黃金交叉' : '死亡交叉') + '。' : '';
    row(tb, 'MACD', (a.dif >= a.dea ? 'DIF 在 DEA 之上' : 'DIF 在 DEA 之下') + '，柱 ' + num(a.hist, 2),
      cross + (a.dif >= 0 ? 'DIF 在零軸之上：中期力道偏多。' : 'DIF 在零軸之下：中期力道偏空。'));
    row(tb, 'RSI12', num(a.rsi12, 0), a.rsi12 >= 70 ? '70 以上，偏熱。' : a.rsi12 <= 30 ? '30 以下，偏冷。' : '在 30～70 之間。');
    row(tb, 'KD', 'K ' + num(a.k, 0) + '、D ' + num(a.d, 0), a.k >= 80 ? '80 以上，收盤靠近最近 9 天的高點。' : a.k <= 20 ? '20 以下，收盤靠近最近 9 天的低點。' : '在中間區域。');
    var pos = a.bollPos;
    row(tb, '布林通道', pos > 1 ? '衝出上軌' : pos > 0.8 ? '靠近上軌' : pos < 0 ? '跌破下軌' : pos < 0.2 ? '靠近下軌' : '在中間',
      '上軌 ' + price(a.bollUp) + '、中軌 ' + price(a.bollMid) + '、下軌 ' + price(a.bollDn) + '。');
    row(tb, '成交量', '前 5 天平均的 ' + num(a.volRatio, 2) + ' 倍', a.volRatio >= 1.5 ? '明顯放量。' : a.volRatio <= 0.7 ? '明顯縮量。' : '跟平常差不多。');
    row(tb, '漲跌幅', frag(['5 天 ', changeSpan(a.chg5), '、20 天 ', changeSpan(a.chg20), '、60 天 ', changeSpan(a.chg60)]));
    row(tb, '52 週高低', frag(['高 ' + price(a.hi52) + '（' + md(a.hi52d) + '）、低 ' + price(a.lo52) + '（' + md(a.lo52d) + '）。離高點 ', changeSpan(a.fromHi52)]));
    row(tb, '波動度', '一年約 ' + num(a.vol20, 0) + '%', '用最近 20 天每天的漲跌算的「年化波動」。數字越大，正常情況下上下晃得越兇。SPY 是 ' + num(T.analyze(state.bars[T.BENCH]).vol20, 0) + '%。');
    row(tb, '週 K', '收盤在 MA20 週' + (a.weekly.vsMa20 >= 0 ? '之上 ' : '之下 ') + signed(a.weekly.vsMa20),
      'MA20 週（約 100 個交易日）是 ' + price(a.weekly.ma20) + '。長期投資看這條比看日 K 穩。');
    var lv = function (arr) { return arr.length ? arr.map(function (x) { return price(x.p) + '（' + x.why.replace(/^(\d{4})-(\d\d)-(\d\d)/, function (m, y, mo, d) { return +mo + '/' + +d; }) + '）'; }).join('、') : '附近沒有明顯的'; };
    row(tb, '上方壓力', lv(a.levels.res), null);
    row(tb, '下方支撐', lv(a.levels.sup), '支撐壓力是電腦從最近半年的轉折點和均線找的參考價，不是一定會停在那裡。');
    table.appendChild(tb);
    var wrap = make('div', 'table-wrap');
    wrap.appendChild(table);
    box.appendChild(wrap);
  }

  // ---------- 預測日記 ----------

  function renderJournalForm() {
    var sel = el('fc-sym');
    T.SYMBOLS.forEach(function (s) {
      var o = make('option', null, s.id + ' ' + s.name);
      o.value = s.id;
      sel.appendChild(o);
    });
    el('fc-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var id = sel.value, bars = state.bars[id], last = bars[bars.length - 1];
      var dir = (document.querySelector('input[name="fc-dir"]:checked') || {}).value;
      var hz = +(document.querySelector('input[name="fc-h"]:checked') || {}).value;
      var msg = el('fc-msg');
      if (!dir || !hz) { msg.textContent = '請選方向和期間。'; return; }
      var stop = parseFloat(el('fc-stop').value);
      var items = store();
      items.push({
        id: Date.now(), s: id, base: last.d, baseClose: last.c, h: hz, dir: dir,
        conf: +el('fc-conf').value, why: el('fc-why').value.trim(), stop: isFinite(stop) ? stop : null
      });
      store(items);
      el('fc-why').value = '';
      el('fc-stop').value = '';
      msg.textContent = '記下來了：' + id + ' 從 ' + dayLabel(last.d) + '收盤 ' + price(last.c) + ' 算起，' + hz + ' 個交易日後對答案。';
      renderJournal();
    });
    el('fc-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]');
      if (!b) return;
      var id = +b.getAttribute('data-del');
      store(store().filter(function (x) { return x.id !== id; }));
      renderJournal();
    });
  }

  function score(items, get) {
    var done = 0, hit = 0, confSum = 0;
    items.forEach(function (x) {
      var o = get(x);
      if (!o.done) return;
      done++;
      confSum += x.conf;
      if (o.dir === x.dir) hit++;
    });
    return { done: done, hit: hit, rate: done ? hit / done * 100 : NaN, conf: done ? confSum / done : NaN };
  }

  function outcomeText(x, o) {
    if (o.missing) return '找不到起算那天的資料';
    if (!o.done) return '等待中：還差 ' + o.left + ' 個交易日';
    return '結果：' + T.WORD.dir[o.dir] + ' ' + signed(o.ret) + '（到 ' + md(o.end) + '）' + (o.dir === x.dir ? '　✓ 猜對' : '　✗ 猜錯');
  }

  function renderJournal() {
    var items = store().slice().reverse(), box = el('fc-list');
    box.textContent = '';
    var get = function (x) { return state.bars[x.s] ? T.outcome(state.bars[x.s], x.base, x.h) : { done: false, missing: true }; };
    if (!items.length) box.appendChild(make('p', 'tool-hint', '還沒有預測。先寫一筆，5 個交易日後回來看。'));
    items.forEach(function (x) {
      var o = get(x), card = make('div', 'fc-item' + (o.done ? (o.dir === x.dir ? ' is-hit' : ' is-miss') : ''));
      var head = make('p', 'fc-head');
      head.appendChild(make('b', null, x.s + ' 猜「' + T.WORD.dir[x.dir] + '」'));
      head.appendChild(document.createTextNode('　' + x.h + ' 個交易日・把握 ' + x.conf + '%・從 ' + dayLabel(x.base) + '收盤 ' + price(x.baseClose) + ' 算起'));
      card.appendChild(head);
      if (x.why) card.appendChild(make('p', 'fc-why', '理由：' + x.why));
      card.appendChild(make('p', 'fc-result', outcomeText(x, o)));
      if (x.stop !== null && o.done) {
        var broke = x.dir === 'down' ? o.high >= x.stop : o.low <= x.stop;
        if (broke) card.appendChild(make('p', 'fc-why', '途中' + (x.dir === 'down' ? '漲破' : '跌破') + '你設的失效價 ' + price(x.stop) + '：照計畫，這筆應該提早認錯。'));
      }
      var del = make('button', 'btn-small', '刪除');
      del.type = 'button';
      del.setAttribute('data-del', x.id);
      card.appendChild(del);
      box.appendChild(card);
    });
    var sc = score(items, get), sum = el('fc-score');
    sum.textContent = sc.done
      ? '你已經揭曉 ' + sc.done + ' 筆，猜對 ' + sc.hit + ' 筆（' + num(sc.rate, 0) + '%）。你平均說有 ' + num(sc.conf, 0) + '% 把握。' + (sc.done >= 10 ? (sc.rate < sc.conf - 10 ? '實際比你以為的差，下次把握打低一點。' : sc.rate > sc.conf + 10 ? '實際比你以為的好，可以更有信心一點。' : '把握和實際差不多，很好。') : '累積到 10 筆以上，這個比較才有意義。')
      : '還沒有揭曉的預測。';
  }

  // Claude 自己的練習預測也記分，猜錯一樣列出來
  function renderClaude() {
    var box = el('cl-list'), calls = state.calls.slice().reverse();
    box.textContent = '';
    var get = function (x) { return state.bars[x.s] ? T.outcome(state.bars[x.s], x.base, x.h) : { done: false, missing: true }; };
    var sc = score(calls, get);
    el('cl-score').textContent = calls.length
      ? (sc.done ? '已揭曉 ' + sc.done + ' 筆，猜對 ' + sc.hit + ' 筆（' + num(sc.rate, 0) + '%）；平均把握 ' + num(sc.conf, 0) + '%。' : '目前 ' + calls.length + ' 筆都還沒揭曉。') + '每份日報會給 6 檔各一個預測，5 個交易日後自動對答案。'
      : '還沒有練習預測。';
    if (!calls.length) return;
    var table = make('table', 'tool-table wide'), thead = make('thead'), tb = make('tbody');
    var hr = make('tr');
    ['日報', '股票', '預測', '把握', '結果'].forEach(function (t) { hr.appendChild(make('th', null, t)); });
    thead.appendChild(hr);
    calls.slice(0, 18).forEach(function (x) {
      var o = get(x), tr = make('tr');
      tr.appendChild(make('td', null, md(x.d)));
      tr.appendChild(make('td', null, x.s));
      tr.appendChild(make('td', null, T.WORD.dir[x.dir]));
      tr.appendChild(make('td', 'num', x.conf + '%'));
      tr.appendChild(make('td', null, outcomeText(x, o).replace('結果：', '')));
      tb.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tb);
    var wrap = make('div', 'table-wrap');
    wrap.appendChild(table);
    box.appendChild(wrap);
  }

  // 基準率：如果什麼都不想，每次都猜同一個方向，會對幾次
  function renderBaseRates() {
    var table = make('table', 'tool-table wide'), thead = make('thead'), tb = make('tbody');
    var hr = make('tr');
    ['股票', '5 天：漲', '盤整', '跌', '20 天：漲', '盤整', '跌'].forEach(function (t, i) { hr.appendChild(make('th', i ? 'num' : null, t)); });
    thead.appendChild(hr);
    var n = 0;
    T.SYMBOLS.forEach(function (s) {
      var b = state.bars[s.id];
      if (!b) return;
      var r5 = T.baseRates(b, 5), r20 = T.baseRates(b, 20), tr = make('tr');
      n = Math.max(n, b.length);
      tr.appendChild(make('td', null, s.id));
      [r5.up, r5.flat, r5.down, r20.up, r20.flat, r20.down].forEach(function (x) { tr.appendChild(make('td', 'num', num(x, 0) + '%')); });
      tb.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tb);
    var box = el('fc-base');
    box.textContent = '';
    var wrap = make('div', 'table-wrap');
    wrap.appendChild(table);
    box.appendChild(wrap);
    box.appendChild(make('p', 'tool-hint', '用網站裡每檔約 ' + n + ' 個交易日的資料算的：每一段 5 天（20 天）結束時，漲超過 2%（5%）算漲、跌超過 2%（5%）算跌，其他算盤整。你的命中率要比「每次都猜最常見的那一種」高，才代表你真的看出了什麼。'));
  }

  // ---------- 過去的日報 ----------

  function renderArchive() {
    var box = el('tr-archive');
    box.textContent = '';
    if (!IDX.reports.length) { box.appendChild(make('p', 'tool-hint', '還沒有日報。')); return; }
    var ul = make('ul', 'tr-archive-list');
    IDX.reports.slice().reverse().forEach(function (d) {
      var li = make('li'), a = make('a', null, dayLabel(d) + ' 的日報');
      a.href = 'trend.html?d=' + d + '#today';
      if (d === state.reportDate) a.setAttribute('aria-current', 'page');
      li.appendChild(a);
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  // ---------- 開始 ----------

  function init() {
    if (!IDX || !T || !C) { showError('資料檔沒有載入成功（data/us/index.js）。請重新整理一次。'); return; }
    var v = '?v=' + IDX.updated;
    var want = new URLSearchParams(location.search).get('d');
    var reports = IDX.reports.slice().sort();
    state.reportDate = reports.indexOf(want) >= 0 ? want : reports[reports.length - 1] || '';
    var files = IDX.files.map(function (f) { return BASE + f + v; });
    if (state.reportDate) files.push(BASE + 'report-' + state.reportDate + '.js' + v);
    loadScripts(files, function (failed) {
      if (failed.length) showError('有 ' + failed.length + ' 個資料檔沒有載入成功，部分內容可能不完整。請重新整理一次。');
      state.bars = T.collect(window);
      state.report = (window.US_REPORTS || []).filter(function (r) { return r.date === state.reportDate; })[0] || null;
      state.calls = [].concat.apply([], window.US_CALLS || []);
      if (!state.bars[T.BENCH]) { showError('沒有讀到股價資料。'); return; }
      renderToday();
      renderBoard();
      renderSymbolPicker();
      selectSymbol(state.sym);
      renderJournalForm();
      renderJournal();
      renderClaude();
      renderBaseRates();
      renderArchive();
      if (location.hash) {
        var t = document.getElementById(location.hash.slice(1));
        if (t) t.scrollIntoView();
      }
    });
  }

  init();
})();
