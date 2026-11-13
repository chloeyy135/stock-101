/* 財報分析：貼上財報數字，照「單季口徑、公告日、缺值不補」的規則在瀏覽器裡算比率。
   不抓網路資料、不內建任何公司的數字：資料都是使用者貼的。
   計算部分（Fin.*）瀏覽器和 Node 都能載入，tests/financials.test.js 測它；畫面部分只在有 document 時啟動。 */
(function (root) {
  'use strict';
  var MISSING = '資料不足，未計算';
  var FIELDS = [
    ['date', '期間結束日'], ['report', '公告日'], ['rev', '營收'], ['cogs', '營業成本'], ['oi', '營業利益'], ['ni', '稅後淨利'], ['eps', 'EPS'],
    ['ta', '資產總額'], ['tl', '負債總額'], ['ca', '流動資產'], ['cl', '流動負債'], ['inv', '存貨'], ['ar', '應收帳款'], ['eq', '股東權益'],
    ['ocf', '營業現金流'], ['capex', '資本支出']
  ];
  var INCOME = ['rev', 'cogs', 'oi', 'ni', 'eps'];
  var CASH = ['ocf', 'capex'];

  function num(s) {
    if (s == null) return null;
    s = String(s).trim().replace(/[,，\s]/g, '');
    if (s === '' || s === '-' || s === '—' || /^n\/?a$/i.test(s)) return null;
    var neg = /^\(.*\)$/.test(s);
    if (neg) s = s.slice(1, -1);
    var v = Number(s);
    if (!isFinite(v)) return NaN;
    return neg ? -v : v;
  }

  // 西元 2025-09-30 或 民國 114/09/30，都轉成西元 ISO；格式錯回傳 null
  function parseDate(s) {
    var m = /^(\d{2,4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(String(s || '').trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < 200) y += 1911;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return y + '-' + (mo < 10 ? '0' : '') + mo + '-' + (d < 10 ? '0' : '') + d;
  }

  function parseTable(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    if (lines.length < 2) return { error: '至少要有標題列和一列資料。' };
    var sep = lines[0].indexOf('\t') >= 0 ? '\t' : ',';
    var head = lines[0].split(sep).map(function (h) { return h.trim(); });
    var idx = {};
    FIELDS.forEach(function (f) { var i = head.indexOf(f[1]); if (i < 0) i = head.indexOf(f[0]); if (i >= 0) idx[f[0]] = i; });
    if (idx.date == null) return { error: '標題列要有「期間結束日」。' };
    var rows = [], errors = [];
    lines.slice(1).forEach(function (line, n) {
      var c = line.split(sep), r = {};
      var d = parseDate(c[idx.date]);
      if (!d) { errors.push('第 ' + (n + 2) + ' 列：期間結束日「' + (c[idx.date] || '') + '」格式不對（用 2025-09-30 或 114/09/30）。'); return; }
      var mo = +d.slice(5, 7);
      if (mo % 3 !== 0) { errors.push('第 ' + (n + 2) + ' 列：期間結束日 ' + d + ' 不是季底。'); return; }
      r.date = d;
      r.report = idx.report != null && String(c[idx.report] || '').trim() !== '' ? parseDate(c[idx.report]) : null;
      if (idx.report != null && String(c[idx.report] || '').trim() !== '' && !r.report) { errors.push('第 ' + (n + 2) + ' 列：公告日格式不對。'); return; }
      FIELDS.forEach(function (f) {
        if (f[0] === 'date' || f[0] === 'report') return;
        var v = idx[f[0]] == null ? null : num(c[idx[f[0]]]);
        if (v !== v) { errors.push('第 ' + (n + 2) + ' 列：「' + f[1] + '」不是數字。'); v = null; }
        r[f[0]] = v;
      });
      rows.push(r);
    });
    return { rows: rows, errors: errors };
  }

  function keyOf(date) { return date.slice(0, 4) + 'Q' + (+date.slice(5, 7) / 3); }
  function dayDiff(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  // 上一季季底（該月最後一天）：用 Date.UTC(年, 月, 0) 取上個月最後一天，避免 6/30 減三個月落在 3/30
  function prevQuarterEnd(date) { return new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 3, 0)).toISOString().slice(0, 10); }
  function div(a, b) { return a == null || b == null || b === 0 ? null : a / b; }

  // 累計 → 單季：同一年內本季減上一季；Q1 原樣；缺上一季或任一值缺就留 null，不補
  function restore(rows, fields, notes) {
    var byKey = {};
    rows.forEach(function (r) { byKey[keyOf(r.date)] = r; });
    var out = {};
    rows.forEach(function (r) {
      var q = +r.date.slice(5, 7) / 3, y = r.date.slice(0, 4), o = {};
      fields.forEach(function (f) {
        if (q === 1) { o[f] = r[f]; return; }
        var p = byKey[y + 'Q' + (q - 1)];
        if (!p) { o[f] = null; return; }
        o[f] = r[f] == null || p[f] == null ? null : r[f] - p[f];
      });
      if (q > 1 && !byKey[y + 'Q' + (q - 1)]) notes.push(keyOf(r.date) + '：缺 ' + y + 'Q' + (q - 1) + '，累計數無法還原成單季，相關欄位標「' + MISSING + '」。');
      out[keyOf(r.date)] = o;
    });
    return out;
  }

  function build(rows, opt) {
    opt = opt || {};
    var notes = [], warns = [];
    rows = rows.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var seen = {};
    for (var i = 0; i < rows.length; i++) {
      var k = keyOf(rows[i].date);
      if (seen[k]) return { error: k + ' 出現兩次，請刪掉重複的列。' };
      seen[k] = 1;
    }
    var inc = opt.incomeBasis === 'cumulative' ? restore(rows, INCOME, notes) : null;
    var cash = opt.cashBasis === 'cumulative' ? restore(rows, CASH, notes) : null;
    if (inc) notes.unshift('損益表（營收、成本、利益、淨利、EPS）是累計數，已逐季相減還原成單季。');
    if (cash) notes.unshift('現金流量表（營業現金流、資本支出）是累計數，已逐季相減還原成單季。');
    var byKey = {};
    var qs = rows.map(function (r) {
      var key = keyOf(r.date), v = {};
      INCOME.forEach(function (f) { v[f] = inc ? inc[key][f] : r[f]; });
      CASH.forEach(function (f) { v[f] = cash ? cash[key][f] : r[f]; });
      ['ta', 'tl', 'ca', 'cl', 'inv', 'ar', 'eq'].forEach(function (f) { v[f] = r[f]; });
      if (r.report && r.report < r.date) warns.push(key + '：公告日 ' + r.report + ' 早於期間結束日，資料有誤。');
      var days = dayDiff(prevQuarterEnd(r.date), r.date);
      var capexOut = v.capex == null ? null : Math.abs(v.capex);
      var fcf = v.ocf == null || capexOut == null ? null : v.ocf - capexOut;
      var m = {
        gm: v.rev == null || v.cogs == null ? null : div(v.rev - v.cogs, v.rev),
        opm: div(v.oi, v.rev), npm: div(v.ni, v.rev),
        roe: div(v.ni, v.eq), roa: div(v.ni, v.ta),
        debt: div(v.tl, v.ta), cur: div(v.ca, v.cl),
        quick: v.ca == null || v.inv == null ? null : div(v.ca - v.inv, v.cl),
        ocfNi: v.ni != null && v.ni > 0 ? div(v.ocf, v.ni) : null,
        fcf: fcf, fcfm: div(fcf, v.rev),
        invDays: v.inv == null || v.cogs == null || v.cogs === 0 ? null : v.inv / v.cogs * days,
        arDays: v.ar == null || v.rev == null || v.rev === 0 ? null : v.ar / v.rev * days,
        opex: v.rev == null || v.cogs == null || v.oi == null ? null : v.rev - v.cogs - v.oi,
        days: days
      };
      var q = { key: key, date: r.date, report: r.report, v: v, m: m, yoyRev: null, yoyEps: null };
      byKey[key] = q;
      return q;
    });
    qs.forEach(function (q) {
      var p = byKey[(+q.date.slice(0, 4) - 1) + 'Q' + (+q.date.slice(5, 7) / 3)];
      if (!p) return;
      if (p.v.rev != null && p.v.rev > 0 && q.v.rev != null) q.yoyRev = q.v.rev / p.v.rev - 1;
      if (p.v.eps != null && p.v.eps > 0 && q.v.eps != null) q.yoyEps = q.v.eps / p.v.eps - 1;
    });
    var noReport = qs.every(function (q) { return !q.report; });
    if (noReport) notes.push('沒有提供公告日：時間以期間結束日對齊，不適用於回測，也可能用到當時還沒公布的資訊。');
    return { quarters: qs, notes: notes, warns: warns, noReport: noReport };
  }

  // 營業利益率單季變動 ≥ 2 個百分點就標轉折，並指出是銷貨成本率還是營業費用率動得比較多
  function turns(qs) {
    var out = [];
    for (var i = 1; i < qs.length; i++) {
      var a = qs[i - 1], b = qs[i];
      if (a.m.opm == null || b.m.opm == null) continue;
      var d = b.m.opm - a.m.opm;
      if (Math.abs(d) < 0.02) continue;
      var dc = a.v.rev && b.v.rev && a.v.cogs != null && b.v.cogs != null ? b.v.cogs / b.v.rev - a.v.cogs / a.v.rev : null;
      var dx = a.m.opex != null && b.m.opex != null && a.v.rev && b.v.rev ? b.m.opex / b.v.rev - a.m.opex / a.v.rev : null;
      var driver = dc == null || dx == null ? '驅動項目資料不足，未計算' : (Math.abs(dc) >= Math.abs(dx) ? '主要來自營業成本率' + (dc > 0 ? '上升' : '下降') + ' ' + (Math.abs(dc) * 100).toFixed(1) + ' 個百分點' : '主要來自營業費用率' + (dx > 0 ? '上升' : '下降') + ' ' + (Math.abs(dx) * 100).toFixed(1) + ' 個百分點');
      out.push(b.key + ' 營業利益率' + (d > 0 ? '上升' : '下降') + ' ' + (Math.abs(d) * 100).toFixed(1) + ' 個百分點（' + a.key + ' ' + (a.m.opm * 100).toFixed(1) + '% → ' + (b.m.opm * 100).toFixed(1) + '%），' + driver);
    }
    return out;
  }

  function pickRange(qs, text) {
    var s = String(text || ''), m = /近\s*(\d+)\s*([季年])/.exec(s);
    if (!m) return qs;
    var n = +m[1] * (m[2] === '年' ? 4 : 1);
    return qs.slice(Math.max(0, qs.length - n));
  }

  var pct = function (x) { return x == null ? null : (x * 100).toFixed(1) + '%'; };
  var fix2 = function (x) { return x == null ? null : x.toFixed(2); };
  var fix1 = function (x) { return x == null ? null : x.toFixed(1); };
  var amt = function (x) { return x == null ? null : Math.round(x).toLocaleString('en-US'); };

  function tables(qs, unit) {
    var u = unit || '';
    return [
      { id: 'profit', title: '獲利能力（單季）', head: ['季度', '營收（' + u + '）', '毛利率', '營業利益率', '稅後淨利率', 'ROE（單季，未年化）', 'ROA（單季，未年化）'],
        rows: qs.map(function (q) { return [q.key, amt(q.v.rev), pct(q.m.gm), pct(q.m.opm), pct(q.m.npm), pct(q.m.roe), pct(q.m.roa)]; }) },
      { id: 'struct', title: '財務結構與現金流', head: ['季度', '負債比', '流動比', '速動比', '營業現金流／稅後淨利', '自由現金流（' + u + '）', '自由現金流率', '存貨週轉天數', '應收帳款天數'],
        rows: qs.map(function (q) { return [q.key, pct(q.m.debt), fix2(q.m.cur), fix2(q.m.quick), fix2(q.m.ocfNi), amt(q.m.fcf), pct(q.m.fcfm), fix1(q.m.invDays), fix1(q.m.arDays)]; }) },
      { id: 'growth', title: '成長', head: ['季度', '期間結束日', '公告日', '營收 YoY', 'EPS（單季）', 'EPS YoY'],
        rows: qs.map(function (q) { return [q.key, q.date, q.report || '未提供', pct(q.yoyRev), q.v.eps == null ? null : q.v.eps.toFixed(2), pct(q.yoyEps)]; }) }
    ];
  }

  var RULES = [
    '你是一位嚴謹的台股財務分析師。以下是已經由程式依規則算好的比率表（全部單季口徑），請依資料做分析。',
    '資料規則（務必遵守）：',
    '1. 所有比率都是單季口徑；累計數已由程式還原，輸出中要註明有做還原（見 notes）。',
    '2. 時間對齊以財報公告日為準；若 report_date_provided 為 false，要在輸出開頭註明「時間以期間結束日對齊，未使用公告日，不適用於回測」。',
    '3. 民國年一律轉西元年。',
    '4. 表中 null 就是「資料不足，未計算」，禁止估算、禁止用常識或記憶中的數字填補。',
    '5. 金額單位與幣別以 unit、currency 欄位為準，輸出要標明。',
    '表格優先，文字精簡，每個數字後標註資料來源期間（例如 2025Q2 單季）。最後一行固定寫：「本分析基於所提供數據，未構成投資建議。」'
  ].join('\n');
  var FRAME = '請依序輸出：一、公司與期間概覽（一句話業務與獲利模式、營收規模與趨勢）；二、獲利能力（逐季表格、標出趨勢轉折點並指出驅動的成本或費用項目、ROE/ROA 資料足夠才算）；三、財務結構與現金流（負債比、流動比、速動比、營業現金流 vs 淨利、自由現金流趨勢、存貨與應收週轉天數變化）；四、成長與品質（營收 YoY、EPS YoY、營收與現金流是否同步；若為選股用途列出 3 個關鍵正向訊號與 3 個關鍵風險訊號）；五、結論與待驗證事項（一段式結論不超過 150 字，並列出因資料限制而未能確認的事項）。';

  function prompt(meta, model, shown, tbls, turnList) {
    var payload = {
      company: meta.company, period: meta.period, purpose: meta.purpose, unit: meta.unit, currency: meta.currency,
      report_date_provided: !model.noReport, notes: model.notes.concat(model.warns),
      tables: tbls.map(function (t) { return { title: t.title, columns: t.head, rows: t.rows }; }),
      margin_turning_points: turnList
    };
    return RULES + '\n\n【分析對象】公司：' + (meta.company || '（未填）') + '；分析期間：' + (meta.period || '（未填）') + '；分析目的：' + meta.purpose + '\n\n```json\n' + JSON.stringify(payload) + '\n```\n\n' + FRAME;
  }

  var Fin = { MISSING: MISSING, FIELDS: FIELDS, num: num, parseDate: parseDate, parseTable: parseTable, build: build, turns: turns, pickRange: pickRange, tables: tables, prompt: prompt, restore: restore };
  if (typeof module !== 'undefined' && module.exports) module.exports = Fin;
  root.Fin = Fin;

  /* ---------- 畫面 ---------- */
  if (typeof document === 'undefined') return;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('fin')) return;
  var last = null, ctl = null;

  function cell(tag, text, cls) { var e = document.createElement(tag); if (text == null) { e.textContent = MISSING; e.className = 'fin-miss'; } else e.textContent = text; if (cls) e.className = cls; return e; }
  function renderTable(t) {
    var wrap = document.createElement('div'), h = document.createElement('h3'), sc = document.createElement('div'), tb = document.createElement('table'), tr = document.createElement('tr'), th = document.createElement('thead'), body = document.createElement('tbody');
    h.className = 'tool-sub'; h.textContent = t.title; sc.className = 'bt-scroll'; tb.className = 'tool-table wide';
    t.head.forEach(function (x) { var c = document.createElement('th'); c.textContent = x; c.scope = 'col'; tr.appendChild(c); });
    th.appendChild(tr);
    t.rows.forEach(function (r) { var row = document.createElement('tr'); r.forEach(function (v, i) { row.appendChild(i === 0 ? cell('th', v) : cell('td', v)); if (i === 0) row.firstChild.scope = 'row'; }); body.appendChild(row); });
    tb.appendChild(th); tb.appendChild(body); sc.appendChild(tb); wrap.appendChild(h); wrap.appendChild(sc);
    return wrap;
  }
  function list(items, cls) { var ul = document.createElement('ul'); if (cls) ul.className = cls; items.forEach(function (s) { var li = document.createElement('li'); li.textContent = s; ul.appendChild(li); }); return ul; }
  function msg(text, bad) { var m = $('fin-msg'); m.textContent = text || ''; m.className = 'tool-msg' + (bad ? ' is-bad' : ''); }

  function compute() {
    var parsed = parseTable($('fin-data').value);
    var out = $('fin-out'); out.textContent = ''; $('fin-actions').hidden = true; $('fin-ai-wrap').hidden = true; last = null;
    if (parsed.error) { msg(parsed.error, true); return; }
    if (parsed.errors.length) { msg(parsed.errors.join('\n'), true); return; }
    var model = build(parsed.rows, { incomeBasis: $('fin-income').value, cashBasis: $('fin-cash').value });
    if (model.error) { msg(model.error, true); return; }
    var shown = pickRange(model.quarters, $('fin-period').value);
    var unit = $('fin-unit').value, tbls = tables(shown, unit), tl = turns(shown);
    msg('已計算 ' + shown.length + ' 季（資料共 ' + model.quarters.length + ' 季）。');
    var notes = model.notes.concat(model.warns);
    notes.unshift('金額單位：' + unit + '（' + $('fin-currency').value + '）；比率不受單位影響。ROE、ROA 用期末權益與期末資產、單季未年化；存貨與應收天數用期末餘額、依該季實際天數；速動比＝（流動資產－存貨）÷流動負債。');
    out.appendChild(list(notes, 'fin-notes'));
    tbls.forEach(function (t) { out.appendChild(renderTable(t)); });
    var h = document.createElement('h3'); h.className = 'tool-sub'; h.textContent = '趨勢轉折點（營業利益率單季變動達 2 個百分點）'; out.appendChild(h);
    if (tl.length) out.appendChild(list(tl)); else { var p = document.createElement('p'); p.className = 'tool-desc'; p.textContent = '所選期間沒有單季變動達 2 個百分點的轉折，或資料不足，未計算。'; out.appendChild(p); }
    last = { meta: { company: $('fin-name').value, period: $('fin-period').value, purpose: $('fin-purpose').value, unit: unit, currency: $('fin-currency').value }, model: model, shown: shown, tbls: tbls, tl: tl };
    $('fin-actions').hidden = false;
  }

  function mdRender(box, text) {
    box.textContent = '';
    var lines = text.split('\n'), i = 0;
    function inline(el, s) { s.split(/\*\*(.+?)\*\*/g).forEach(function (part, k) { if (!part) return; var n = k % 2 ? document.createElement('b') : document.createTextNode(''); if (k % 2) { n.textContent = part; el.appendChild(n); } else el.appendChild(document.createTextNode(part)); }); }
    while (i < lines.length) {
      var l = lines[i];
      if (/^\s*\|/.test(l)) {
        var rows = []; while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        var sc = document.createElement('div'), tb = document.createElement('table'); sc.className = 'bt-scroll'; tb.className = 'tool-table wide';
        rows.filter(function (r) { return !/^\s*\|[\s:|-]+\|?\s*$/.test(r); }).forEach(function (r, n) {
          var tr = document.createElement('tr'); r.trim().replace(/^\||\|$/g, '').split('|').forEach(function (c) { var e = document.createElement(n === 0 ? 'th' : 'td'); inline(e, c.trim()); tr.appendChild(e); }); tb.appendChild(tr);
        });
        sc.appendChild(tb); box.appendChild(sc); continue;
      }
      var hm = /^(#{1,4})\s+(.*)$/.exec(l);
      if (hm) { var h = document.createElement('h3'); h.className = 'tool-sub'; inline(h, hm[2]); box.appendChild(h); i++; continue; }
      if (/^\s*[-*]\s+/.test(l)) { var ul = document.createElement('ul'); while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { var li = document.createElement('li'); inline(li, lines[i].replace(/^\s*[-*]\s+/, '')); ul.appendChild(li); i++; } box.appendChild(ul); continue; }
      if (l.trim()) { var p = document.createElement('p'); inline(p, l); box.appendChild(p); }
      i++;
    }
  }

  function copyPrompt() {
    if (!last) return;
    var text = prompt(last.meta, last.model, last.shown, last.tbls, last.tl), btn = $('fin-copy');
    var done = function (ok) { btn.textContent = ok ? '已複製' : '複製失敗，請在下方框內手動選取'; if (!ok) { var t = $('fin-prompt'); t.hidden = false; t.value = text; t.select(); } setTimeout(function () { btn.textContent = '複製提示詞'; }, 2000); };
    try { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  }

  var samplePromise = (root.claude && root.claude.use) ? root.claude.use('sample').catch(function () { return null; }) : Promise.resolve(null);
  samplePromise.then(function (sample) {
    if (!sample) return;
    var ask = $('fin-ask'), stop = $('fin-stop'); ask.hidden = false;
    ask.addEventListener('click', function () {
      if (!last) return;
      ctl = new AbortController(); ask.disabled = true; stop.hidden = false; $('fin-ai-wrap').hidden = false; $('fin-ai').textContent = 'Claude 分析中…';
      sample(prompt(last.meta, last.model, last.shown, last.tbls, last.tl), { signal: ctl.signal, cache: false, onText: function (e) { mdRender($('fin-ai'), e.text); } })
        .then(function (r) { mdRender($('fin-ai'), r.text); if (r.truncated) msg('回答被截斷，請縮短期間再試。', true); })
        .catch(function (e) { if (e && e.code === 'aborted') return; msg(e && e.code === 'not_granted' ? '你沒有允許使用 Claude，改用「複製提示詞」貼到對話裡。' : e && e.code === 'rate_limited' ? '要求太頻繁，請稍後再試。' : 'Claude 分析失敗：' + ((e && e.message) || '未知錯誤'), true); })
        .then(function () { ask.disabled = false; stop.hidden = true; ctl = null; });
    });
    stop.addEventListener('click', function () { if (ctl) ctl.abort(); });
  });

  $('fin-run').addEventListener('click', compute);
  $('fin-copy').addEventListener('click', copyPrompt);
})(typeof window !== 'undefined' ? window : globalThis);
