# 台股入門 60 天 — 把整個網站打包成一個 HTML 檔，給 claude.ai 的 Artifact 預覽用（網站本身不會用到）。
# 用法：python3 tools/build-preview.py <repo 根目錄> <輸出的 html 檔>
# 預覽裡的分頁改用網址 # 切換：#home、#lessons、#day-N、#tools、#guide、#trend。
# 工具、看盤指南、美股日報放在 <template> 裡，打開時才放進 #page-static，
# 所以看盤指南和美股日報的指標實驗室（都是 id="lab"）不會同時出現。
# 各頁裡的段落 id 會打開它所屬的那一頁；美股日報自己的 #lab 改成 #trend-lab。
import sys, re, pathlib
repo = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
read = lambda p: (repo / p).read_text(encoding='utf-8')
css, lessons, app, tools, chart = read('css/style.css'), read('js/lessons.js'), read('js/app.js'), read('js/tools.js'), read('js/chart.js')
core, trend = read('js/trend-core.js'), read('js/trend.js')

# 深淺色：尊重看的人在 claude.ai 上選的主題
m = re.search(r'@media \(prefers-color-scheme: dark\) \{\n  :root \{(.*?)\n  \}\n\}', css, re.S)
assert m
dark = m.group(1)
css = css.replace(m.group(0),
    '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {' + dark + '\n  }\n}\n'
    ':root[data-theme="dark"] {' + dark + '\n}')

def rep(s, a, b):
    assert s.count(a) == 1, a
    return s.replace(a, b)

def links(s):
    s = re.sub(r'href="lesson\.html\?day=(\d+)"', r'href="#day-\1"', s)
    s = s.replace('href="guide.html#lab"', 'href="#lab"').replace('href="guide.html"', 'href="#guide"')
    s = s.replace('href="trend.html"', 'href="#trend"')
    s = s.replace('href="tools.html"', 'href="#tools"').replace('href="lessons.html"', 'href="#lessons"').replace('href="index.html"', 'href="#home"')
    return s

def main_of(page):
    html = read(page)
    a = html.index('<main id="main">') + len('<main id="main">')
    return links(html[a:html.index('</main>')])

pages = {'tools': main_of('tools.html'), 'guide': main_of('guide.html'), 'trend': main_of('trend.html')}
anchors = {}
for name in ['tools', 'guide', 'trend']:
    for i in re.findall(r'\sid="([^"]+)"', pages[name]):
        key = i if i not in anchors else name + '-' + i
        if key != i:
            pages[name] = pages[name].replace('href="#' + i + '"', 'href="#' + key + '"')
        anchors[key] = [name, i]

lessons = links(lessons)
app = links(app)
app = rep(app, "function lessonURL(day) { return 'lesson.html?day=' + day; }",
               "function lessonURL(day) { return '#day-' + day; }")
app = rep(app, "var day = parseInt(new URLSearchParams(location.search).get('day'), 10);",
               "var day = window.__previewDay;")
app = rep(app, "    document.addEventListener('keydown', function (e) {", "    document.onkeydown = function (e) {")
app = rep(app, "      if (e.key === 'ArrowRight' && next) location.href = lessonURL(next.day);\n    });",
               "      if (e.key === 'ArrowRight' && next) location.href = lessonURL(next.day);\n    };")
app = rep(app, "    var page = document.body.getAttribute('data-page');",
"""    var h = location.hash.replace('#', '');
    if (h === 'main') return;
    var dm = /^day-(\\d+)$/.exec(h);
    var anchor = window.__anchors[h];
    var page = dm ? 'lesson' : h === 'lessons' ? 'catalog' : h === 'tools' || h === 'guide' || h === 'trend' ? h : anchor ? anchor[0] : 'home';
    var isStatic = page === 'tools' || page === 'guide' || page === 'trend';
    window.__previewDay = dm ? +dm[1] : null;
    document.getElementById('main').hidden = isStatic;
    var box = document.getElementById('page-static');
    box.hidden = !isStatic;
    if (page !== 'lesson') document.onkeydown = null;
    var titles = { catalog: '全部課程｜', tools: '實戰工具｜', guide: '看盤指南｜', trend: '美股日報｜' };
    document.title = (titles[page] || '') + BRAND;
    Array.prototype.forEach.call(document.querySelectorAll('.site-nav a'), function (a) {
      if (a.getAttribute('data-nav') === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (isStatic) {
      if (box.getAttribute('data-page') !== page) {
        box.textContent = '';
        var main = document.createElement('main');
        main.appendChild(document.getElementById('tpl-' + page).content.cloneNode(true));
        box.appendChild(main);
        box.setAttribute('data-page', page);
        window.__run[page]();
      }
      var target = anchor && anchor[0] === page && document.getElementById(anchor[1]);
      if (target) { setTimeout(function () { target.scrollIntoView(); }, 0); return; }
      window.scrollTo(0, 0);
      return;
    }
    box.textContent = '';
    box.removeAttribute('data-page');
    window.scrollTo(0, 0);""")
app = rep(app, "  window.StockCourse = { courseDay: courseDay, dateLabel: dateLabel, START: START };\n  init();",
               "  window.StockCourse = { courseDay: courseDay, dateLabel: dateLabel, START: START };\n"
               "  window.addEventListener('hashchange', init);\n  init();")

# 美股日報：資料已經內嵌，不用再載入；過去日報的連結在預覽裡都指向最新一期
trend = rep(trend, "    var files = IDX.files.map(function (f) { return BASE + f + v; });\n    if (state.reportDate) files.push(BASE + 'report-' + state.reportDate + '.js' + v);",
                   "    var files = [];")
trend = rep(trend, "      a.href = 'trend.html?d=' + d + '#today';", "      a.href = '#today';")
trend = rep(trend, "      a.href = 'trend.html';", "      a.href = '#trend';")
trend = rep(trend, "      if (location.hash) {", "      if (false) {")

idx = read('data/us/index.js')
data_files = re.findall(r'"([^"]+\.js)"', idx)
reports = re.findall(r'"(\d{4}-\d\d-\d\d)"', idx[idx.index('"reports"'):])
data = [idx] + [read('data/us/' + f) for f in data_files] + [read('data/us/report-' + d + '.js') for d in reports]
data_js = '\n'.join(data)

import json
templates = ''.join('<template id="tpl-%s">%s</template>\n' % (k, v) for k, v in pages.items())
page = f'''<title>台股入門 60 天</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&display=swap">
<style>
{css}
</style>
<header class="site-header">
  <a class="brand" href="#home"><span class="brand-mark" aria-hidden="true"></span>台股入門 60 天</a>
  <nav class="site-nav" aria-label="主選單">
    <a href="#home" data-nav="home">今天</a>
    <a href="#lessons" data-nav="catalog">課程</a>
    <a href="#trend" data-nav="trend">日報</a>
    <a href="#guide" data-nav="guide">看盤</a>
    <a href="#tools" data-nav="tools">工具</a>
  </nav>
</header>
<main id="main"></main>
<div id="page-static" class="page-static" hidden></div>
{templates}<footer class="site-footer">
  <p>本站所有內容為教育用途，不構成買賣建議。投資有賺有賠，請自己判斷。</p>
  <p>案例數字都標了資料日期和來源；股價每天在變，請以最新公告為準。</p>
</footer>
<script>
{lessons}
</script>
<script>
window.__anchors = {json.dumps(anchors, ensure_ascii=False)};
window.__runChart = function () {{
{chart}
}};
window.__runChart();
</script>
<script>
{core}
</script>
<script>
{data_js}
</script>
<script>
window.__run = {{
  tools: function () {{
{tools}
  }},
  guide: function () {{ window.__runChart(); }},
  trend: function () {{
    window.__runChart();
{trend}
  }}
}};
</script>
<script>
{app}
</script>
'''
out.write_text(page, encoding='utf-8')
print('wrote', out, len(page.encode('utf-8')), 'bytes; anchors', len(anchors))
