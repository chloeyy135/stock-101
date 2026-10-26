/* 台股入門 60 天 — 首頁、目錄、課文三個頁面共用的程式 */
(function () {
  'use strict';

  var START = '2026-10-26';      // 第 1 天
  var STORE_KEY = 'tw-stock-30-read';
  var DAY_MS = 86400000;
  var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
  var DISCLAIMER = '本課為教育用途，不構成買賣建議';

  var LESSONS = (window.LESSONS || []).slice().sort(function (a, b) { return a.day - b.day; });
  var WEEKS = window.WEEKS || {};
  var TOTAL = LESSONS.length;
  var BRAND = '台股入門 ' + TOTAL + ' 天';

  // ---------- 日期 ----------

  function ymdToUTC(s) {
    var p = s.split('-');
    return Date.UTC(+p[0], +p[1] - 1, +p[2]);
  }

  // 用台灣時間決定「今天」，人在國外也不會差一天。
  // 網址加 ?today=2026-11-03 可以預覽某一天（測試用）。
  function todayYMD() {
    var q = new URLSearchParams(location.search).get('today');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date());
      var get = function (t) { return parts.filter(function (x) { return x.type === t; })[0].value; };
      return get('year') + '-' + get('month') + '-' + get('day');
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // 今天是第幾天（可能小於 1 或大於 TOTAL）
  function courseDay() {
    return Math.floor((ymdToUTC(todayYMD()) - ymdToUTC(START)) / DAY_MS) + 1;
  }

  function lessonDate(day) {
    var d = new Date(ymdToUTC(START) + (day - 1) * DAY_MS);
    return {
      y: d.getUTCFullYear(),
      m: d.getUTCMonth() + 1,
      d: d.getUTCDate(),
      w: WEEKDAYS[d.getUTCDay()]
    };
  }

  function dateLabel(day) {
    var x = lessonDate(day);
    return x.m + '月' + x.d + '日（' + x.w + '）';
  }

  // ---------- 已讀紀錄（存在這台裝置的瀏覽器） ----------

  var storageOK = true;

  function loadRead() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      if (!Array.isArray(v)) return [];
      return v.filter(function (n) { return n === Math.floor(n) && n >= 1 && n <= TOTAL; });
    } catch (e) {
      storageOK = false;
      return [];
    }
  }

  function saveRead(list) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      storageOK = false;
      return false;
    }
  }

  function isRead(day) { return loadRead().indexOf(day) !== -1; }

  function setRead(day, value) {
    var list = loadRead().filter(function (n) { return n !== day; });
    if (value) list.push(day);
    list.sort(function (a, b) { return a - b; });
    return saveRead(list);
  }

  // ---------- 小工具 ----------

  function byDay(day) {
    for (var i = 0; i < LESSONS.length; i++) if (LESSONS[i].day === day) return LESSONS[i];
    return null;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function lessonURL(day) { return 'lesson.html?day=' + day; }

  // draft：課文還在查證資料，只有標題和目標
  function isDraft(L) { return !!(L && L.draft); }

  function el(id) { return document.getElementById(id); }

  function storageNotice() {
    return storageOK ? '' :
      '<p class="notice">這個瀏覽器目前無法記錄「已讀」（可能開了無痕模式）。課程照樣可以讀，只是關掉後不會記得進度。</p>';
  }

  // ---------- 首頁 ----------

  function renderHome() {
    var main = el('main');
    var today = courseDay();
    var read = loadRead();
    var phase = today < 1 ? 'before' : today > TOTAL ? 'after' : 'during';
    var firstUnread = 0;
    for (var i = 1; i <= TOTAL; i++) if (read.indexOf(i) === -1 && !isDraft(byDay(i))) { firstUnread = i; break; }

    var featured = phase === 'before' ? 1 : phase === 'during' ? today : (firstUnread || TOTAL);
    var L = byDay(featured);

    var band, button, note = '';
    if (phase === 'before') {
      band = '<span>' + dateLabel(1) + ' 開課</span><span>還有 ' + (1 - today) + ' 天</span>';
      button = '先看第 1 課';
      note = '課程從 ' + lessonDate(1).y + ' 年 ' + dateLabel(1) + '開始，每天自動換下一課。想先偷看也可以。';
    } else if (phase === 'during') {
      band = '<span>今天 ' + dateLabel(today) + '</span><span>第 ' + L.week + ' 週</span>';
      button = '讀今天的課';
    } else {
      band = '<span>' + TOTAL + ' 天課程走完了</span><span>' + read.length + ' / ' + TOTAL + ' 已讀</span>';
      button = firstUnread ? '補讀第 ' + featured + ' 課' : '再讀一次最後一課';
      note = firstUnread ? '還有沒讀的課，從最前面那一課開始補。' : TOTAL + ' 課全部讀完了。之後想複習，可以從每週的實戰日開始。';
    }
    if (isDraft(L)) {
      button = '看這一課的預告';
      note = '這一課的課文還在查證資料，寫好就會出現在這裡。先複習前面的實戰日也很好。';
    }

    var html = '';
    html += '<section class="cal" aria-labelledby="today-title">';
    html += '<div class="cal-band">' + band + '</div>';
    html += '<div class="cal-perf" aria-hidden="true"></div>';
    html += '<div class="cal-body">';
    html += '<p class="cal-day"><span>第</span><span class="cal-num">' + L.day + '</span><span>天</span></p>';
    html += '<p class="cal-of">共 ' + TOTAL + ' 天</p>';
    html += '<h1 class="cal-title" id="today-title">' + esc(L.title) + '</h1>';
    html += '<p class="cal-goal">' + esc(L.goal) + '</p>';
    html += '<a class="btn" href="' + lessonURL(L.day) + '">' + button + '</a>';
    if (note) html += '<p class="cal-note">' + note + '</p>';
    html += '</div></section>';

    // 中間有漏讀的課，提醒一下
    if (phase === 'during' && firstUnread && firstUnread < today) {
      var missed = 0;
      for (var j = 1; j < today; j++) if (read.indexOf(j) === -1 && !isDraft(byDay(j))) missed++;
      html += '<div class="catchup"><p>前面還有 ' + missed + ' 課沒標記已讀，最早的是 <a href="' + lessonURL(firstUnread) + '">第 ' + firstUnread + ' 天：' + esc(byDay(firstUnread).title) + '</a>。</p></div>';
    }

    html += storageNotice();

    html += '<section aria-labelledby="progress-title">';
    html += '<h2 class="section-title" id="progress-title">我的進度</h2>';
    html += '<p class="progress-text">已讀 <strong>' + read.length + '</strong> 課，共 ' + TOTAL + ' 課。點任何一格都能直接看那一課。</p>';
    html += monthGrid(read, today);
    html += '<ul class="month-legend"><li><span class="swatch-read"></span>已讀</li><li><span class="swatch-today"></span>今天</li><li><span class="swatch-todo"></span>還沒讀</li></ul>';
    html += '</section>';

    html += '<section aria-labelledby="howto-title">';
    html += '<h2 class="section-title" id="howto-title">怎麼用</h2>';
    html += '<ul class="howto">';
    html += '<li>每天一課：先讀觀念和真實案例，再照「今日實戰」實際操作一次。</li>';
    html += '<li>第 1 天就開戶，第 7 天下第一筆小額零股；每週最後一天是實戰日。</li>';
    html += '<li>看盤 App 上的 K 線、均線、MACD、KD、RSI 看不懂，到<a href="guide.html">看盤指南</a>的指標實驗室點點看。</li>';
    html += '<li>算成本、漲跌停價、該買多少，還有記錄每一筆交易，都在<a href="tools.html">實戰工具</a>。</li>';
    html += '<li>讀完按課文最下面的「標記為已讀」，格子就會變紅。在台股，紅色代表上漲。</li>';
    html += '<li>進度只存在你這台手機或平板的瀏覽器裡，換裝置不會跟著走。</li>';
    html += '</ul>';
    html += '<p><a href="lessons.html">看全部 ' + TOTAL + ' 課的目錄</a></p>';
    html += '</section>';

    main.innerHTML = html;
  }

  // 一列 7 天（第 1 天剛好是星期一）
  function monthGrid(read, today) {
    var head = ['一', '二', '三', '四', '五', '六', '日'];
    var html = '<div class="month" role="list" aria-label="' + TOTAL + ' 天進度">';
    head.forEach(function (h) { html += '<div class="month-head" aria-hidden="true">' + h + '</div>'; });
    LESSONS.forEach(function (L) {
      var cls = [];
      var done = read.indexOf(L.day) !== -1;
      if (done) cls.push('is-read');
      if (L.day === today) cls.push('is-today');
      if (L.review) cls.push('is-review');
      if (isDraft(L)) cls.push('is-draft');
      var label = '第 ' + L.day + ' 天：' + L.title + (done ? '（已讀）' : '') + (L.day === today ? '（今天）' : '') + (isDraft(L) ? '（準備中）' : '');
      html += '<div role="listitem"><a class="' + cls.join(' ') + '" href="' + lessonURL(L.day) + '" aria-label="' + esc(label) + '">' + (L.review ? '實戰' : L.day) + '</a></div>';
    });
    html += '</div>';
    return html;
  }

  // ---------- 目錄 ----------

  function renderCatalog() {
    var main = el('main');
    var today = courseDay();
    var read = loadRead();
    var html = '<h1 class="page-title">全部課程</h1>';
    var drafts = LESSONS.filter(isDraft).length;
    html += '<p class="page-lead">' + TOTAL + ' 天、' + TOTAL + ' 課，每課都有一個用真實市場做的實戰練習。已讀 ' + read.length + ' / ' + TOTAL + '。' +
      (drafts ? '標「準備中」的 ' + drafts + ' 課還在查證資料，先看標題和目標。' : '') + '</p>';
    html += storageNotice();

    var weeks = {};
    LESSONS.forEach(function (L) { (weeks[L.week] = weeks[L.week] || []).push(L); });

    Object.keys(weeks).sort(function (a, b) { return a - b; }).forEach(function (w) {
      var list = weeks[w];
      html += '<section class="week" aria-labelledby="week-' + w + '">';
      html += '<h2 class="week-title" id="week-' + w + '">第 ' + w + ' 週　' + esc(WEEKS[w] || '') +
        '<small>' + dateLabel(list[0].day) + '起</small></h2>';
      html += '<ol class="toc">';
      list.forEach(function (L) {
        var done = read.indexOf(L.day) !== -1;
        var isToday = L.day === today;
        var right = done ? '<span class="seal" aria-label="已讀">已讀</span>' :
          isToday ? '<span class="tag tag-today">今天</span>' :
          isDraft(L) ? '<span class="tag tag-draft">準備中</span>' : '<span></span>';
        html += '<li' + (isToday ? ' class="toc-today"' : '') + '><a href="' + lessonURL(L.day) + '">' +
          '<span class="toc-day">' + L.day + '</span>' +
          '<span><span class="toc-title">' + esc(L.title) + '</span><span class="toc-date">' + dateLabel(L.day) + '</span></span>' +
          right + '</a></li>';
      });
      html += '</ol></section>';
    });
    main.innerHTML = html;
  }

  // ---------- 課文 ----------

  function sourceList(list) {
    if (!list || !list.length) return '';
    var html = '<div class="sources"><p class="sources-title">資料來源</p><ul>';
    list.forEach(function (s) {
      html += '<li>' + esc(s.label) + (s.date ? '（資料日期：' + esc(s.date) + '）' : '') +
        (s.url ? '　<a href="' + esc(s.url) + '" target="_blank" rel="noopener">開啟來源</a>' : '') + '</li>';
    });
    return html + '</ul></div>';
  }

  function renderLesson() {
    var main = el('main');
    var day = parseInt(new URLSearchParams(location.search).get('day'), 10);
    var L = byDay(day);
    if (!L) {
      main.innerHTML = '<h1 class="page-title">找不到這一課</h1>' +
        '<p>網址裡的課號不對。課程從第 1 天到第 ' + TOTAL + ' 天。</p>' +
        '<p><a class="btn" href="lessons.html">回到全部課程</a></p>';
      document.title = '找不到這一課｜' + BRAND;
      return;
    }

    document.title = '第 ' + L.day + ' 天　' + L.title + '｜' + BRAND;
    var today = courseDay();
    var done = isRead(L.day);

    var html = '<article class="lesson">';
    html += '<header class="lesson-head">';
    html += '<p class="lesson-meta"><span><b>第 ' + L.day + ' 天</b>　' + dateLabel(L.day) + '</span><span>第 ' + L.week + ' 週　' + esc(WEEKS[L.week] || '') + '</span>' +
      (L.day === today ? '<span class="tag tag-today">今天的課</span>' : '') + '</p>';
    html += '<h1 class="lesson-title">' + esc(L.title) + '</h1>';
    html += '<span class="seal' + (done ? ' is-on' : '') + '" id="seal" aria-hidden="true">已讀</span>';
    html += '</header>';

    html += '<div class="goal"><span class="goal-label">今天學什麼</span><p>' + esc(L.goal) + '</p></div>';

    var prev = byDay(L.day - 1);
    var next = byDay(L.day + 1);

    if (isDraft(L)) {
      html += '<div class="notice draft-notice"><p><b>這一課正在準備中。</b>課文裡的每個數字都要先查到來源和日期，寫好就會出現在這裡。</p>' +
        '<p>先做這件事：回到這一週之前的實戰日，把還沒完成的練習補完。</p></div>';
      html += '<p class="disclaimer">' + DISCLAIMER + '</p>';
      html += pager(prev, next);
      html += '</article>';
      main.innerHTML = html;
      arrowKeys(prev, next);
      return;
    }

    html += '<h2>白話解釋</h2>' + L.explain;

    html += '<h2>台股實際案例</h2>';
    html += '<div class="case">';
    html += '<p class="case-name">' + esc(L.example.name) + (L.example.code ? ' <span class="ticker">' + esc(L.example.code) + '</span>' : '') + '</p>';
    html += L.example.body;
    html += sourceList(L.example.sources);
    html += '</div>';

    if (L.practice) {
      html += '<h2>今日實戰</h2>';
      html += '<div class="practice">' + L.practice + sourceList(L.practiceSources) + '</div>';
    }

    html += '<h2>想一想</h2>';
    html += '<div class="quiz"><p class="quiz-q">' + L.question + '</p>';
    html += '<details><summary>看答案</summary>' + L.answer + '</details></div>';

    html += '<h2>三行重點</h2><ul class="points">';
    L.points.forEach(function (p) { html += '<li>' + p + '</li>'; });
    html += '</ul>';

    html += '<p class="disclaimer">' + DISCLAIMER + '</p>';

    html += '<div class="read-box">';
    html += '<button type="button" class="btn' + (done ? '' : ' btn-quiet') + '" id="read-btn" aria-pressed="' + done + '">' +
      (done ? '已讀（再按一次取消）' : '標記為已讀') + '</button>';
    html += '<p class="read-hint" id="read-hint">' + (storageOK ? '紀錄只存在這台裝置的瀏覽器。' : '這個瀏覽器無法記錄已讀（可能開了無痕模式）。') + '</p>';
    html += '</div>';

    html += pager(prev, next);
    html += '</article>';

    main.innerHTML = html;

    var btn = el('read-btn');
    var seal = el('seal');
    btn.addEventListener('click', function () {
      var now = !isRead(L.day);
      var ok = setRead(L.day, now);
      if (!ok) {
        el('read-hint').textContent = '這個瀏覽器無法記錄已讀（可能開了無痕模式）。';
        return;
      }
      btn.setAttribute('aria-pressed', String(now));
      btn.textContent = now ? '已讀（再按一次取消）' : '標記為已讀';
      btn.classList.toggle('btn-quiet', !now);
      seal.classList.add('is-stamping');
      seal.classList.toggle('is-on', now);
    });

    arrowKeys(prev, next);
  }

  function pager(prev, next) {
    var html = '<nav class="pager" aria-label="上一課和下一課">';
    html += prev ? '<a class="prev" href="' + lessonURL(prev.day) + '" rel="prev"><small>上一課</small>第 ' + prev.day + ' 天　' + esc(prev.title) + '</a>' :
      '<span class="prev"><small>上一課</small>這是第一課</span>';
    html += next ? '<a class="next" href="' + lessonURL(next.day) + '" rel="next"><small>下一課</small>第 ' + next.day + ' 天　' + esc(next.title) + '</a>' :
      '<span class="next"><small>下一課</small>這是最後一課</span>';
    return html + '</nav>';
  }

  // 外接鍵盤的 iPad：左右方向鍵換課
  function arrowKeys(prev, next) {
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' && prev) location.href = lessonURL(prev.day);
      if (e.key === 'ArrowRight' && next) location.href = lessonURL(next.day);
    });
  }

  // ---------- 啟動 ----------

  function init() {
    var page = document.body.getAttribute('data-page');
    loadRead();
    if (page === 'home') renderHome();
    else if (page === 'catalog') renderCatalog();
    else if (page === 'lesson') renderLesson();
  }

  // 從別頁按「上一頁」回來時，重新畫一次，已讀狀態才會是最新的
  window.addEventListener('pageshow', function (e) { if (e.persisted) init(); });

  window.StockCourse = { courseDay: courseDay, dateLabel: dateLabel, START: START };
  init();
})();
