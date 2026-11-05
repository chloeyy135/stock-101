#!/usr/bin/env python3
"""把回測頁（含進階模式）打包成一個可以離線打開的 HTML：樣式、日線資料、引擎、畫面程式全部內嵌。
用法：python3 tools/build_backtest_preview.py <輸出檔>
預覽裡其他頁面不存在，所以導覽列的連結改成留在本頁。"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
r = lambda p: (ROOT / p).read_text(encoding='utf-8')
css = r('css/style.css')
m = re.search(r'@media \(prefers-color-scheme: dark\) \{\n  :root \{(.*?)\n  \}\n\}', css, re.S)
assert m
dark = m.group(1)
css = css.replace(m.group(0), '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {' + dark + '\n    color-scheme: dark;\n  }\n}\n:root[data-theme="dark"] {' + dark + '\n  color-scheme: dark;\n}')
html = r('backtest.html')
bars_files = re.findall(r'<script src="(data/backtest/bars/[^"]+)"', html)
body = html[html.index('<a class="skip-link"'):html.index('<script src="data/backtest/results.js">')]
body = re.sub(r'href="(index|lessons|trend|guide|tools|lesson)\.html[^"]*"', 'href="#main"', body)
body = body.replace('href="backtest.html"', 'href="#main"')
out = ('<title>歷史回測</title>\n'
       '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
       '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&display=swap">\n'
       '<style>\n' + css + '\n' + r('css/backtest.css') + '\nbody{background:var(--bg);color:var(--ink)}\n</style>\n'
       + body
       + '<script>\n' + r('data/backtest/results.js') + '\n</script>\n'
       + ''.join('<script>\n' + r(f) + '\n</script>\n' for f in bars_files)
       + '<script>\n' + r('js/backtest-engine.js') + '\n</script>\n'
       + '<script>\n' + r('js/backtest.js') + '\n</script>\n'
       + '<script>\n' + r('js/backtest-lab.js') + '\n</script>\n')
dest = pathlib.Path(sys.argv[1])
dest.write_text(out, encoding='utf-8')
print(dest, len(out) // 1024, 'KB')
