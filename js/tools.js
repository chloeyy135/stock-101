/* 台股入門 30 天 — 實戰工具：交易成本、漲跌停價、停損與部位大小、我的交易紀錄 */
(function () {
  'use strict';

  var FEE_RATE = 0.001425;
  var TAX = { stock: 0.003, etf: 0.001 };
  var KEY_FEE = 'tw-stock-30-fee';
  var KEY_LOG = 'tw-stock-30-trades';
  var KEY_PRICE = 'tw-stock-30-prices';

  function el(id) { return document.getElementById(id); }
  function num(id) { var v = parseFloat(el(id).value); return isFinite(v) ? v : NaN; }
  function val(id) { return el(id).value; }
  function checked(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }

  function fmt(n, d) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('zh-TW', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 2 : d });
  }
  function money(n) { return isFinite(n) ? fmt(Math.round(n), 0) + ' 元' : '—'; }
  function signed(n) {
    if (!isFinite(n)) return '—';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : '';
    return '<span class="' + cls + '">' + (n > 0 ? '+' : '') + fmt(Math.round(n), 0) + ' 元</span>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function save(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; }
  }

  // ---------- 台股規則 ----------

  // 升降單位（一般股票六級；ETF 兩級）
  function tick(price, kind) {
    if (kind === 'etf') return price < 50 ? 0.01 : 0.05;
    if (price < 10) return 0.01;
    if (price < 50) return 0.05;
    if (price < 100) return 0.1;
    if (price < 500) return 0.5;
    if (price < 1000) return 1;
    return 5;
  }

  // 用「分」做整數運算，避免小數誤差。漲停往下取、跌停往上取到升降單位。
  function limits(prev, kind) {
    var c = Math.round(prev * 100);
    var upRaw = c * 11 / 10, downRaw = c * 9 / 10;
    var tu = Math.round(tick(upRaw / 100, kind) * 100);
    var td = Math.round(tick(downRaw / 100, kind) * 100);
    var up = Math.floor(c * 11 / (10 * tu) + 1e-9) * tu;
    var down = Math.ceil(c * 9 / (10 * td) - 1e-9) * td;
    return { up: up / 100, down: down / 100, tickUp: tu / 100, tickDown: td / 100 };
  }

  function feeSettings() {
    return load(KEY_FEE, { discount: 10, min: 20 });
  }

  function fee(amount, settings) {
    if (!(amount > 0)) return 0;
    var f = Math.floor(amount * FEE_RATE * settings.discount / 10);
    return Math.max(f, settings.min);
  }

  function tax(amount, kind) {
    return amount > 0 ? Math.floor(amount * TAX[kind]) : 0;
  }

  // 買進後，股價要到多少賣掉才不虧（含買賣手續費與交易稅）
  function breakEven(price, qty, kind, settings) {
    var amount = price * qty;
    var paid = amount + fee(amount, settings);
    var p = price;
    for (var i = 0; i < 20000; i++) {
      var a = p * qty;
      if (a - fee(a, settings) - tax(a, kind) >= paid) return p;
      p = Math.round((p + tick(p, kind)) * 100) / 100;
    }
    return NaN;
  }

  function todayTW() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      var g = function (t) { return parts.filter(function (x) { return x.type === t; })[0].value; };
      return g('year') + '-' + g('month') + '-' + g('day');
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  // ---------- 1. 交易成本 ----------

  function initFees() {
    var s = feeSettings();
    el('fee-discount').value = s.discount;
    el('fee-min').value = s.min;
  }

  function readFeeInputs() {
    var d = num('fee-discount'), m = num('fee-min');
    var s = { discount: d > 0 && d <= 10 ? d : 10, min: m >= 0 ? m : 20 };
    save(KEY_FEE, s);
    return s;
  }

  function calcCost() {
    var side = checked('cost-side'), kind = checked('cost-kind');
    var price = num('cost-price'), qty = num('cost-qty');
    var s = readFeeInputs();
    var out = el('cost-out');
    if (!(price > 0) || !(qty > 0)) { out.innerHTML = '<p class="tool-hint">填入價格和股數，就會算出結果。</p>'; return; }
    var amount = price * qty;
    var f = fee(amount, s);
    var rows = [['成交金額', money(amount)], ['手續費', money(f) + (f === s.min && amount * FEE_RATE * s.discount / 10 < s.min ? '（最低手續費）' : '')]];
    if (side === 'buy') {
      rows.push(['你要付', '<b>' + money(amount + f) + '</b>']);
      rows.push(['手續費占比', fmt(f / amount * 100, 2) + '%']);
      var be = breakEven(price, qty, kind, s);
      rows.push(['損益兩平賣價', '<b>' + fmt(be, 2) + ' 元</b>（賣掉不虧的最低價，已含賣出手續費和交易稅）']);
    } else {
      var t = tax(amount, kind);
      rows.push(['證券交易稅（' + (kind === 'etf' ? '0.1%' : '0.3%') + '）', money(t)]);
      rows.push(['你會收到', '<b>' + money(amount - f - t) + '</b>']);
    }
    out.innerHTML = table(rows);
  }

  function table(rows) {
    return '<div class="table-wrap"><table class="tool-table"><tbody>' + rows.map(function (r) {
      return '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  // ---------- 2. 漲跌停價 ----------

  function calcLimit() {
    var prev = num('limit-prev'), kind = checked('limit-kind');
    var out = el('limit-out');
    if (!(prev > 0)) { out.innerHTML = '<p class="tool-hint">填入昨天的收盤價（昨收）。</p>'; return; }
    var r = limits(prev, kind);
    out.innerHTML = table([
      ['漲停價', '<span class="up"><b>' + fmt(r.up, 2) + ' 元</b></span>（' + fmt(prev * 1.1, 4) + ' 往下取到 ' + fmt(r.tickUp, 2) + ' 元一格）'],
      ['跌停價', '<span class="down"><b>' + fmt(r.down, 2) + ' 元</b></span>（' + fmt(prev * 0.9, 4) + ' 往上取到 ' + fmt(r.tickDown, 2) + ' 元一格）'],
      ['今天一格跳', fmt(tick(prev, kind), 2) + ' 元（以昨收價位計）']
    ]);
  }

  // ---------- 3. 停損與部位大小 ----------

  function calcSize() {
    var cap = num('size-capital'), riskPct = num('size-risk'), buy = num('size-buy'), stop = num('size-stop');
    var out = el('size-out');
    if (!(cap > 0) || !(riskPct > 0) || !(buy > 0) || !(stop > 0)) { out.innerHTML = '<p class="tool-hint">四格都填好，就會算出最多可以買多少。</p>'; return; }
    if (stop >= buy) { out.innerHTML = '<p class="tool-error">停損價要比買進價低。請把停損價改小。</p>'; return; }
    var maxLoss = cap * riskPct / 100;
    var perShare = buy - stop;
    var qty = Math.floor(maxLoss / perShare);
    var byCash = Math.floor(cap / buy);
    var capped = qty > byCash;
    if (capped) qty = byCash;
    out.innerHTML = table([
      ['每筆最多願意賠', money(maxLoss)],
      ['每股風險', fmt(perShare, 2) + ' 元（跌 ' + fmt(perShare / buy * 100, 1) + '% 停損）'],
      ['最多可買', '<b>' + fmt(qty, 0) + ' 股</b>' + (capped ? '（受限於資金）' : '')],
      ['需要金額', money(qty * buy) + '（占資金 ' + fmt(qty * buy / cap * 100, 1) + '%，未含手續費）'],
      ['如果停損', '大約少 ' + money(qty * perShare)]
    ]);
  }

  // ---------- 4. 我的交易紀錄 ----------

  var trades = [];
  var prices = {};
  var pendingDelete = null;

  function loadTrades() {
    var t = load(KEY_LOG, []);
    trades = Array.isArray(t) ? t.filter(function (x) { return x && x.code && x.qty > 0 && x.price > 0; }) : [];
    var p = load(KEY_PRICE, {});
    prices = p && typeof p === 'object' ? p : {};
  }

  function autoFillTradeCosts() {
    var price = num('t-price'), qty = num('t-qty');
    var side = val('t-side'), kind = val('t-kind');
    var s = feeSettings();
    if (price > 0 && qty > 0) {
      var a = price * qty;
      el('t-fee').value = fee(a, s);
      el('t-tax').value = side === 'sell' ? tax(a, kind) : 0;
    }
  }

  function addTrade(e) {
    e.preventDefault();
    var msg = el('t-msg');
    var t = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: val('t-date') || todayTW(),
      code: val('t-code').trim().toUpperCase(),
      name: val('t-name').trim(),
      side: val('t-side'),
      kind: val('t-kind'),
      price: num('t-price'),
      qty: Math.floor(num('t-qty')),
      fee: Math.max(0, num('t-fee') || 0),
      tax: Math.max(0, num('t-tax') || 0),
      note: val('t-note').trim()
    };
    if (!t.code) { msg.textContent = '請填股票代號，例如 0050。'; return; }
    if (!(t.price > 0) || !(t.qty > 0)) { msg.textContent = '請填成交價格和股數。'; return; }
    if (t.side === 'sell') {
      var held = positions()[t.code];
      if (!held || held.qty < t.qty) { msg.textContent = '你的紀錄裡 ' + t.code + ' 只有 ' + (held ? held.qty : 0) + ' 股，賣出股數不能比持有多。'; return; }
    }
    trades.push(t);
    if (!save(KEY_LOG, trades)) { msg.textContent = '這個瀏覽器無法儲存（可能開了無痕模式），紀錄關掉後會消失。'; }
    else msg.textContent = '已記下 ' + t.date + ' ' + (t.side === 'buy' ? '買進' : '賣出') + ' ' + t.code + ' ' + t.qty + ' 股。';
    el('t-price').value = ''; el('t-qty').value = ''; el('t-fee').value = ''; el('t-tax').value = ''; el('t-note').value = '';
    renderTrades();
  }

  // 平均成本法：買進成本含手續費；賣出時依平均成本扣除
  function positions() {
    var map = {};
    trades.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).forEach(function (t) {
      var p = map[t.code] || (map[t.code] = { code: t.code, name: t.name, kind: t.kind, qty: 0, cost: 0, realized: 0, fees: 0 });
      if (t.name) p.name = t.name;
      p.kind = t.kind;
      p.fees += t.fee + t.tax;
      var amount = t.price * t.qty;
      if (t.side === 'buy') {
        p.qty += t.qty;
        p.cost += amount + t.fee;
      } else if (p.qty > 0) {
        var q = Math.min(t.qty, p.qty);
        var avg = p.cost / p.qty;
        p.realized += amount - t.fee - t.tax - avg * q;
        p.cost -= avg * q;
        p.qty -= q;
      }
    });
    return map;
  }

  function renderTrades() {
    var pos = positions();
    var codes = Object.keys(pos);
    var s = feeSettings();
    var sum = el('t-summary');
    if (!codes.length) {
      sum.innerHTML = '<p class="tool-hint">還沒有紀錄。第 7 天下完第一筆零股後，從上面記下來。</p>';
    } else {
      var totalCost = 0, totalValue = 0, totalRealized = 0, totalFees = 0, hasPrice = true;
      var rows = codes.map(function (c) {
        var p = pos[c];
        var price = parseFloat(prices[c]);
        var value = price > 0 ? price * p.qty : NaN;
        var sellCost = price > 0 && p.qty > 0 ? fee(value, s) + tax(value, p.kind) : 0;
        var unreal = price > 0 ? value - sellCost - p.cost : NaN;
        totalCost += p.cost; totalRealized += p.realized; totalFees += p.fees;
        if (p.qty > 0) { if (price > 0) totalValue += value - sellCost; else hasPrice = false; }
        return '<tr><td><b>' + esc(c) + '</b> ' + esc(p.name) + '</td>' +
          '<td class="num">' + fmt(p.qty, 0) + '</td>' +
          '<td class="num">' + (p.qty > 0 ? fmt(p.cost / p.qty, 2) : '—') + '</td>' +
          '<td class="num"><label class="sr-only" for="px-' + esc(c) + '">' + esc(c) + ' 現價</label><input class="price-input" type="number" inputmode="decimal" step="0.01" min="0" id="px-' + esc(c) + '" data-code="' + esc(c) + '" value="' + (price > 0 ? price : '') + '" placeholder="填現價"></td>' +
          '<td class="num">' + (p.qty > 0 ? signed(unreal) : '—') + '</td>' +
          '<td class="num">' + signed(p.realized) + '</td></tr>';
      }).join('');
      sum.innerHTML = '<div class="table-wrap"><table class="tool-table wide"><thead><tr><th>代號</th><th class="num">股數</th><th class="num">平均成本</th><th class="num">現價</th><th class="num">未實現損益</th><th class="num">已實現損益</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="tool-hint">平均成本含買進手續費；未實現損益已先扣掉估計的賣出手續費和交易稅。手續費和交易稅合計付了 ' + money(totalFees) + '。' +
        (hasPrice ? ' 持股總市值（扣賣出成本後）約 ' + money(totalValue) + '，未實現合計 ' + signed(totalValue - totalCost) + '，已實現合計 ' + signed(totalRealized) + '。' : ' 填上每檔的現價，就會算出未實現損益。') + '</p>';
      Array.prototype.forEach.call(sum.querySelectorAll('.price-input'), function (inp) {
        inp.addEventListener('change', function () {
          prices[inp.getAttribute('data-code')] = inp.value;
          save(KEY_PRICE, prices);
          renderTrades();
        });
      });
    }

    var list = el('t-list');
    if (!trades.length) { list.innerHTML = ''; return; }
    list.innerHTML = '<div class="table-wrap"><table class="tool-table wide"><thead><tr><th>日期</th><th>買賣</th><th>代號</th><th class="num">價格</th><th class="num">股數</th><th class="num">費用＋稅</th><th>理由／出場條件</th><th></th></tr></thead><tbody>' +
      trades.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).map(function (t) {
        var confirm = pendingDelete === t.id;
        return '<tr><td>' + esc(t.date) + '</td><td>' + (t.side === 'buy' ? '<span class="up">買進</span>' : '<span class="down">賣出</span>') + '</td>' +
          '<td>' + esc(t.code) + ' ' + esc(t.name) + '</td><td class="num">' + fmt(t.price, 2) + '</td><td class="num">' + fmt(t.qty, 0) + '</td>' +
          '<td class="num">' + fmt(t.fee + t.tax, 0) + '</td><td class="note-cell">' + esc(t.note) + '</td>' +
          '<td><button type="button" class="btn-small' + (confirm ? ' is-danger' : '') + '" data-del="' + esc(t.id) + '">' + (confirm ? '確定刪除' : '刪除') + '</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    Array.prototype.forEach.call(list.querySelectorAll('[data-del]'), function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-del');
        if (pendingDelete !== id) { pendingDelete = id; renderTrades(); return; }
        trades = trades.filter(function (t) { return t.id !== id; });
        pendingDelete = null;
        save(KEY_LOG, trades);
        el('t-msg').textContent = '已刪除一筆紀錄。';
        renderTrades();
      });
    });
  }

  // 備份與還原：紀錄只存在這台裝置，換手機前先複製備份
  function backup() {
    var box = el('backup-text');
    box.value = JSON.stringify({ trades: trades, prices: prices }, null, 0);
    box.hidden = false;
    box.focus();
    box.select();
    var msg = el('backup-msg');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(box.value).then(function () { msg.textContent = '已複製備份文字，貼到記事本存起來。'; },
        function () { msg.textContent = '已選取備份文字，請手動複製。'; });
    } else {
      msg.textContent = '已選取備份文字，請手動複製。';
    }
  }

  function restore() {
    var box = el('backup-text');
    var msg = el('backup-msg');
    if (box.hidden || !box.value.trim()) {
      box.hidden = false;
      box.value = '';
      box.focus();
      msg.textContent = '把之前複製的備份文字貼進上面的框，再按一次「還原備份」。';
      return;
    }
    try {
      var d = JSON.parse(box.value);
      if (!d || !Array.isArray(d.trades)) throw new Error('格式不對');
      trades = d.trades.filter(function (x) { return x && x.code && x.qty > 0 && x.price > 0; });
      prices = d.prices && typeof d.prices === 'object' ? d.prices : {};
      save(KEY_LOG, trades); save(KEY_PRICE, prices);
      msg.textContent = '已還原 ' + trades.length + ' 筆紀錄。';
      renderTrades();
    } catch (err) {
      msg.textContent = '還原失敗：貼上的文字不是這個網站產生的備份。請重新複製完整的備份文字。';
    }
  }

  function init() {
    initFees();
    ['cost-price', 'cost-qty', 'fee-discount', 'fee-min'].forEach(function (id) { el(id).addEventListener('input', calcCost); });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="cost-side"], input[name="cost-kind"]'), function (r) { r.addEventListener('change', calcCost); });
    el('limit-prev').addEventListener('input', calcLimit);
    Array.prototype.forEach.call(document.querySelectorAll('input[name="limit-kind"]'), function (r) { r.addEventListener('change', calcLimit); });
    ['size-capital', 'size-risk', 'size-buy', 'size-stop'].forEach(function (id) { el(id).addEventListener('input', calcSize); });

    el('t-date').value = todayTW();
    ['t-price', 't-qty'].forEach(function (id) { el(id).addEventListener('input', autoFillTradeCosts); });
    ['t-side', 't-kind'].forEach(function (id) { el(id).addEventListener('change', autoFillTradeCosts); });
    el('trade-form').addEventListener('submit', addTrade);
    el('backup-btn').addEventListener('click', backup);
    el('restore-btn').addEventListener('click', restore);

    loadTrades();
    calcCost(); calcLimit(); calcSize(); renderTrades();
  }

  window.StockTools = { tick: tick, limits: limits, fee: fee, tax: tax, breakEven: breakEven };
  init();
})();
