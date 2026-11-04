/* 台股入門 60 天 — 美股入門：入門 12 步的勾選紀錄，和「我的配置規劃」計算 */
(function () {
  'use strict';

  var KEY_PLAN = 'tw-stock-30-usplan';
  var KEY_STEPS = 'tw-stock-30-usteps';
  var SAT = 0.2;          // 股票裡衛星個股的比例
  var CAP = 0.1;          // 單一個股最多占股票的比例
  var ESTATE_USD = 60000; // 非美國人的美國遺產稅門檻
  var FIELDS = ['p-total', 'p-monthly', 'p-months', 'p-near', 'p-home', 'p-fx', 'h-twetf', 'h-twstock', 'h-tsla', 'h-usstock', 'h-usetf', 'p-dca'];

  function el(id) { return document.getElementById(id); }
  function num(id) { var v = parseFloat(el(id).value); return isFinite(v) ? v : 0; }
  function wan(x) { return (Math.round(x * 10) / 10).toLocaleString('zh-TW', { maximumFractionDigits: 1 }) + ' 萬'; }
  function pct(x) { return Math.round(x * 100) + '%'; }
  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v === null ? fallback : v; } catch (e) { return fallback; }
  }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 無痕模式存不了也沒關係 */ } }

  // ---------- 入門 12 步 ----------

  function initSteps() {
    var done = load(KEY_STEPS, []);
    var items = document.querySelectorAll('#us-steps li');
    Array.prototype.forEach.call(items, function (li) {
      var n = li.getAttribute('data-step');
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'us-check';
      box.checked = done.indexOf(n) >= 0;
      box.setAttribute('aria-label', '第 ' + n + ' 步做完了');
      li.insertBefore(box, li.firstChild);
      li.classList.toggle('is-done', box.checked);
      box.addEventListener('change', function () {
        var list = load(KEY_STEPS, []).filter(function (x) { return x !== n; });
        if (box.checked) list.push(n);
        save(KEY_STEPS, list);
        li.classList.toggle('is-done', box.checked);
        stepsMsg(list.length, items.length);
      });
    });
    stepsMsg(done.length, items.length);
  }

  function stepsMsg(n, total) {
    el('us-steps-msg').textContent = n ? '已完成 ' + n + ' / ' + total + ' 步。' : '';
  }

  // ---------- 我的配置規劃 ----------

  function row(tbody, cells) {
    var tr = document.createElement('tr');
    cells.forEach(function (c, i) {
      var td = document.createElement(i ? 'td' : 'th');
      if (i) td.className = 'num';
      td.textContent = c;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  function li(ul, text) {
    var item = document.createElement('li');
    item.textContent = text;
    ul.appendChild(item);
  }

  function calc() {
    var total = num('p-total'), emergency = num('p-monthly') * num('p-months'), near = num('p-near');
    var risk = parseFloat((document.querySelector('input[name="p-risk"]:checked') || {}).value || 70) / 100;
    var home = Math.min(100, Math.max(0, num('p-home'))) / 100;
    var fx = num('p-fx'), months = Math.max(1, Math.round(num('p-dca')));
    var h = { twetf: num('h-twetf'), twstock: num('h-twstock'), tsla: num('h-tsla'), usstock: num('h-usstock'), usetf: num('h-usetf') };
    var held = h.twetf + h.twstock + h.tsla + h.usstock + h.usetf;
    var out = el('plan-out'), err = el('plan-error');
    out.textContent = '';
    err.hidden = true;

    var invest = total - emergency - near;
    if (total <= 0) { err.hidden = false; err.textContent = '先填可動用的資金總額。'; return; }
    if (held > total) { err.hidden = false; err.textContent = '持股市值加起來比資金總額還多，請檢查數字（資金總額要包含股票市值）。'; return; }
    if (invest <= 0) { err.hidden = false; err.textContent = '扣掉緊急預備金和 3 年內要用的錢之後，沒有剩下可以長期投資的錢。先把這兩筆存好，再開始投資。'; return; }

    var stocks = invest * risk, safe = invest - stocks;
    var core = stocks * (1 - SAT), sat = stocks * SAT;
    var coreTW = core * home, coreUS = core - coreTW, cap = stocks * CAP;
    var heldSat = h.twstock + h.tsla + h.usstock;
    var cashNow = total - held;

    // 1. 配置表
    var table = document.createElement('table');
    table.className = 'tool-table wide';
    var thead = document.createElement('thead'), tb = document.createElement('tbody');
    var hr = document.createElement('tr');
    ['項目', '建議', '目前', '差多少'].forEach(function (t, i) {
      var th = document.createElement('th');
      th.textContent = t;
      if (i) th.className = 'num';
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    function diff(target, now) { var d = target - now; return (d > 0 ? '補 ' : d < 0 ? '減 ' : '') + wan(Math.abs(d)); }
    var cashTarget = emergency + near + safe;
    row(tb, ['現金類（預備金＋3 年內要用＋現金或短債）', wan(cashTarget), wan(cashNow), diff(cashTarget, cashNow)]);
    row(tb, ['　其中緊急預備金', wan(emergency), '', '']);
    row(tb, ['台股 ETF（核心）', wan(coreTW), wan(h.twetf), diff(coreTW, h.twetf)]);
    row(tb, ['美國／全球 ETF（核心）', wan(coreUS), wan(h.usetf), diff(coreUS, h.usetf)]);
    row(tb, ['個股（衛星，含台積電、TSLA）', wan(sat), wan(heldSat), diff(sat, heldSat)]);
    table.appendChild(thead);
    table.appendChild(tb);
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.appendChild(table);

    var head = document.createElement('p');
    head.className = 'tr-score';
    head.textContent = '可以長期投資的錢 ' + wan(invest) + '：股票 ' + pct(risk) + '（' + wan(stocks) + '），現金或短期債券 ' + wan(safe) + '。單一個股上限 ' + wan(cap) + '。';
    out.appendChild(head);
    out.appendChild(wrap);

    // 2. 要做的事
    var todo = document.createElement('ul');
    todo.className = 'plan-todo';
    if (h.tsla > cap) {
      var trim = h.tsla - cap;
      li(todo, 'TSLA ' + wan(h.tsla) + '，超過單一個股上限 ' + wan(cap) + '。建議減碼約 ' + wan(trim) + '，分三批，每批約 ' + wan(trim / 3) + '：現在一批、反彈到你設的價位一批、合併條款或年底再一批。賣掉的錢轉進核心 ETF。');
    }
    if (h.twstock > cap) li(todo, '台股個股 ' + wan(h.twstock) + ' 超過單一個股上限 ' + wan(cap) + '（如果主要是台積電一檔）。0050 裡已經有約六成台積電，等於重複押注，新的錢先不要再加台積電。');
    if (h.usstock > cap) li(todo, '其他美股個股合計 ' + wan(h.usstock) + '；檢查有沒有任何一檔超過 ' + wan(cap) + '。');
    if (heldSat > sat) li(todo, '個股合計 ' + wan(heldSat) + '，比衛星的建議上限 ' + wan(sat) + ' 多 ' + wan(heldSat - sat) + '。這段時間新的錢只買核心 ETF，不加個股。');
    var toTW = Math.max(0, coreTW - h.twetf), toUS = Math.max(0, coreUS - h.usetf);
    if (toTW + toUS > 0) {
      li(todo, '核心 ETF 還要補 ' + wan(toTW + toUS) + '。分 ' + months + ' 個月投入，每月約 ' + wan((toTW + toUS) / months) + '（台股 ETF ' + wan(toTW / months) + '、美國／全球 ETF ' + wan(toUS / months) + '）。研究顯示一次投入約三分之二的時間贏過分批，但分批比較不怕「一買就大跌」的後悔，新手分 6～12 個月很合理。');
    }
    if (cashNow < emergency) li(todo, '現金 ' + wan(cashNow) + ' 比緊急預備金 ' + wan(emergency) + ' 還少：先把預備金補足，再談投資。');
    if (!todo.children.length) li(todo, '目前的配置已經很接近建議了，照計畫每月定期定額、每年再平衡一次就好。');
    var t2 = document.createElement('p');
    t2.className = 'tool-sub';
    t2.textContent = '接下來要做的事';
    out.appendChild(t2);
    out.appendChild(todo);

    // 3. 遺產稅提醒
    if (fx > 0) {
      var usNow = (h.tsla + h.usstock + h.usetf) * 10000 / fx;
      var usPlan = (coreUS + Math.min(sat, h.tsla + h.usstock)) * 10000 / fx;
      var note = document.createElement('p');
      note.className = 'notice';
      note.textContent = '美國資產：目前約 ' + Math.round(usNow).toLocaleString('en-US') + ' 美元，照規劃投完約 ' + Math.round(usPlan).toLocaleString('en-US') + ' 美元。' +
        (Math.max(usNow, usPlan) > ESTATE_USD
          ? '超過 6 萬美元的部分，未來可能要繳美國遺產稅（最高 40%）。部位變大後可以研究愛爾蘭註冊的同類 ETF（例如 CSPX、VWRA，一般認為不算美國資產；通常要在海外券商買），金額大時請問會計師。'
          : '還在 6 萬美元以下。');
      out.appendChild(note);
    } else {
      var hint = document.createElement('p');
      hint.className = 'tool-hint';
      hint.textContent = '填入當天的美元匯率，可以順便檢查美國資產有沒有超過遺產稅的 6 萬美元門檻。';
      out.appendChild(hint);
    }

    var v = {};
    FIELDS.forEach(function (id) { v[id] = el(id).value; });
    v.risk = (document.querySelector('input[name="p-risk"]:checked') || {}).value;
    save(KEY_PLAN, v);
  }

  function initPlan() {
    var v = load(KEY_PLAN, null);
    if (v) {
      FIELDS.forEach(function (id) { if (v[id] !== undefined) el(id).value = v[id]; });
      var r = v.risk && document.querySelector('input[name="p-risk"][value="' + v.risk + '"]');
      if (r) r.checked = true;
    }
    el('plan-form').addEventListener('input', calc);
    el('plan-form').addEventListener('change', calc);
    calc();
  }

  initSteps();
  initPlan();
})();
