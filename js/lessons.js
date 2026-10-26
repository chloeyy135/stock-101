/* 台股入門 60 天 — 課程內容（實戰版）
   每課結構：goal（今天學什麼）、explain（白話解釋）、example（台股案例＋來源）、
   practice（今日實戰）、question / answer（想一想）、points（三行重點）。
   免責聲明由 app.js 自動加在每課最後。案例數字都附資料日期與來源；查不到的數字一律不寫。 */

window.WEEKS = {
  1: '速成基礎＋開戶下單',
  2: '看懂公司：基本面實戰',
  3: '看懂價格：K 線、均線和指標',
  4: '長期投資：策略和市場 sense',
  5: '第一個月總結＋美股和看盤 App',
  6: '基本面進階：估值',
  7: '技術面進階：趨勢和型態',
  8: '產業和總經 sense',
  9: '兩個月總結'
};

(function () {
  // 重複用到的資料來源
  var S = {
    tsmcShares: { label: '台積電投資人關係「公司基本資料」：普通股 259 億 3 仟 2 佰萬股', date: '2026-06-30', url: 'https://investor.tsmc.com/chinese/fundamentals' },
    tsmcHolders: { label: '工商時報：台積電股東人數 2,559,571 人，創新高（集保資料）', date: '2026-04-02', url: 'https://www.ctee.com.tw/news/20260428700058-430201' },
    close1021: { label: 'ETtoday 財經雲：台積電收漲 15 元至 2,420 元', date: '2026-10-21', url: 'https://finance.ettoday.net/news/3258451' },
    close1022: { label: 'ETtoday 財經雲：台股震盪 1,290 點，台積電跌 35 元收最低 2,385 元', date: '2026-10-22', url: 'https://finance.ettoday.net/news/3259149' },
    taiex1022: { label: '理財周刊：加權指數下跌 846.34 點（−1.81%），收 46,041.43 點', date: '2026-10-22', url: 'https://www.moneyweekly.com.tw/ArticleData/Info/Article/257402' },
    mcap0923: { label: '優分析：台積電收 2,500 元，市值 64.83 兆元', date: '2026-09-23', url: 'https://uanalyze.com.tw/articles/8928955903' },
    open: { label: '玉山證券「新開帳戶」：線上開戶說明（年滿 18 歲、雙證件、綁定交割銀行帳戶）', url: 'https://www.esunsec.com.tw/new-account/new.aspx' },
    openDays: { label: 'my-finance：證券開戶流程，線上申請約 5～10 分鐘，審核約 1～3 天', url: 'https://www.my-finance.com.tw/tw/News_Detail/118' },
    age18: { label: '永豐金證券：年滿 18 歲可自行開立證券戶', url: 'https://www.sinotrade.com.tw/richclub/invest/guide/junior-account-opening' },
    lotSize: { label: '公視新聞網：整張交易單位是 1,000 股，零股是 1～999 股', url: 'https://news.pts.org.tw/article/823493' },
    oddLot: { label: '今周刊：盤中零股 2020/10/26 上路，9:00～13:30 可下單，漲跌幅同普通交易 10%', date: '2020-10-21', url: 'https://www.businesstoday.com.tw/article/category/80402/post/202010210019/' },
    oddLot5s: { label: '科技新報：盤中零股撮合間隔 2024/12/2 起由 1 分鐘縮短為 5 秒', date: '2024-11-28', url: 'https://finance.technews.tw/2024/11/28/odd-lot-trade-matching-interval-reduced-to-5-seconds-1202/' },
    oddLotRod: { label: '科技新報：盤中零股只能電子下單、用當日有效限價單，不能融資融券、不能當沖', date: '2024-11-19', url: 'https://finance.technews.tw/2024/11/19/5-seconds-matching/' },
    afterOdd: { label: '口袋學堂：盤後零股委託時間為 13:40～14:30', url: 'https://www.pocket.tw/school/articles/4541/' },
    limit10: { label: 'CMoney：台股漲跌幅 2015/6/1 起由 7% 放寬為 10%', url: 'https://www.cmoney.tw/notes/note-detail.aspx?nid=26521' },
    tick: { label: 'uptogo 財經：股票升降單位（一般股票分六級；ETF 未滿 50 元 0.01 元、50 元以上 0.05 元）', url: 'https://uptogo.com.tw/財經/股票價格最小單位？/' },
    up0731: { label: '經濟日報：台積電以漲停 2,425 元收盤；外資買超 675 億元，買台積電約 1.37 萬張', date: '2026-07-31', url: 'https://money.udn.com/money/amp/story/5607/9663334' },
    up0731b: { label: '優分析：台股飆漲逾 3,200 點，台積電盤中亮燈漲停，貢獻漲點約 1,748 點', date: '2026-07-31', url: 'https://uanalyze.com.tw/articles/5109952546' },
    rally0731: { label: '自由時報：台積電漲停帶頭衝，台股飆漲 3,186 點創紀錄', date: '2026-07-31', url: 'https://ec.ltn.com.tw/article/paper/1764857' },
    inst0731: { label: '經濟日報：三大法人合計買超 846.76 億元；外資買超 675.54 億元、投信買超 333.82 億元、自營商賣超 162.59 億元', date: '2026-07-31', url: 'https://money.udn.com/money/amp/story/5607/9663527' },
    crash0717: { label: '自由財經：台積電暴跌 180 元收 2,290 元（−7.29%），加權指數收跌 2,953.71 點（−6.47%）至 42,671.27 點', date: '2026-07-17', url: 'https://ec.ltn.com.tw/m/article/breakingnews/5508227' },
    crash0717Tvbs: { label: 'TVBS 新聞網：台股大跌，135 家跌停', date: '2026-07-17', url: 'https://news.tvbs.com.tw/money/3260204' },
    crash0717Setn: { label: '三立新聞網：台積電重挫、台股收盤崩跌，報導整理的下跌原因', date: '2026-07-17', url: 'https://www.setn.com/ampnews/1873855' },
    crash0717Cna: { label: '中央社：台股重挫，三大法人賣超約新台幣 2,617 億元', date: '2026-07-17', url: 'https://www.cna.com.tw/news/afe/202607170299.aspx' },
    crash0407: { label: 'Yahoo 股市：台股收盤崩跌 2,065 點，創當時史上最大跌點，收 19,232.35 點', date: '2025-04-07', url: 'https://tw.stock.yahoo.com/news/%E3%80%8A%E5%8F%B0%E8%82%A1%E7%9B%A4%E5%BE%8C%E3%80%8B%E6%94%B6%E7%9B%A4%E5%B4%A9%E8%B7%8C2065%E9%BB%9E-%E5%89%B5%E5%8F%B2%E4%B8%8A%E6%9C%80%E5%A4%A7%E8%B7%8C%E9%BB%9E-081500144.html' },
    rebound0411: { label: 'Yahoo 股市：台股續彈 528 點，收 19,528.77 點', date: '2025-04-11', url: 'https://tw.stock.yahoo.com/news/%E7%9B%A4%E5%BE%8C%E7%84%A6%E9%BB%9E-%E6%AC%8A%E5%80%BC%E8%82%A1%E8%81%AF%E6%89%8B%E5%A4%A7%E6%BC%B2-%E5%8F%B0%E8%82%A1%E7%BA%8C%E5%BD%88528%E9%BB%9E%E6%94%B6%E5%BE%A9%E6%9C%AC%E9%80%B1%E9%80%BE%E5%8D%8A%E5%A4%B1%E5%9C%9F-064608860.html' },
    taiexBase: { label: 'uptogo 財經：加權指數以 1966 年為基期，基期指數 100 點', url: 'https://uptogo.com.tw/財經/什麼是加權指數？/' },
    orders: { label: 'ETtoday 財經雲：逐筆交易 2020/3/23 上線，開盤、收盤時段只能用「限價 ROD」委託', date: '2020-03', url: 'https://finance.ettoday.net/news/1659539' },
    fees: { label: 'Money101：股票手續費 0.1425%（買賣各一次，常見最低 20 元）、證交稅股票 0.3%、ETF 0.1%（賣出才收）', date: '2026', url: 'https://www.money101.com.tw/blog/%E8%B2%B7%E8%B3%A3%E8%82%A1%E7%A5%A8%E6%89%8B%E7%BA%8C%E8%B2%BB%E6%80%8E%E9%BA%BC%E7%AE%97%EF%BC%9F%E4%B8%80%E5%BC%B5%E5%9C%96%E8%A1%A8%E8%AE%93%E4%BD%A0%E4%B8%80%E7%9C%8B%E5%B0%B1%E6%87%82' },
    oddFee: { label: 'Money101：零股手續費比較，有券商最低 1 元，也有券商仍收最低 20 元', date: '2026', url: 'https://www.money101.com.tw/blog/%E7%86%B1%E9%96%80%E5%88%B8%E5%95%86%E6%AF%94%E4%B8%80%E6%AF%94' },
    t2: { label: '工商時報：成交後第二個營業日（T+2）上午 10 點前，交割帳戶要備足款項', date: '2026-09-24', url: 'https://www.ctee.com.tw/news/20260924701370-430201' },
    defaultFee: { label: '經濟日報：股市波動，小額違約交割暴增（違約金最高為成交金額 7%）', date: '2026', url: 'https://money.udn.com/money/story/5607/9622042' },
    defaultRule: { label: '經理人：違約交割的後果（帳戶凍結、註銷，未結案者不能再開戶下單）', url: 'https://www.managertoday.com.tw/answer/view/2813' },
    yageo: { label: '科技新報：國巨發生鉅額違約交割，合計 3,880 萬元', date: '2026-06-30', url: 'https://finance.technews.tw/2026/06/30/yageo-massive-settlement-default-nt38-8-million/' },
    dayTradeTax: { label: '中央社：現股當沖證交稅減半為千分之 1.5，適用到 2027/12/31', date: '2026-03-18', url: 'https://www.cna.com.tw/news/afe/202603180213.aspx' },
    cht0709: { label: '時報資訊：中華電除息 5.2 元，除息前收盤 139.5 元、除息參考價 134.3 元，殖利率約 3.73%', date: '2026-07-09', url: 'https://wantrich.chinatimes.com/news/20260709900213-420101' },
    chtDivHist: { label: '玩股網：中華電歷年除息（2022～2026 年現金股利）', url: 'https://www.wantgoo.com/stock/2412/dividend-policy/ex-dividend' },
    cht25: { label: '鉅亨網：中華電 2025 年每股盈餘 4.99 元（8 年新高）；全年營收 2,361.1 億元，年增 2.7%', date: '2026-02', url: 'https://news.cnyes.com/news/id/6308119' },
    tsmcDiv: { label: '經濟日報：台積電董事會通過每股現金股利 7 元，9/16 除息', date: '2026-05-12', url: 'https://money.udn.com/money/amp/story/5607/9498782' },
    tsmcQ4_25: { label: '科技新報：台積電 2025 年第四季每股盈餘 19.50 元', date: '2026-01-15', url: 'https://technews.tw/2026/01/15/tsmc-2025-q4-financial-report/' },
    tsmcY25: { label: 'ETtoday 財經雲：台積電 2025 年每股盈餘 66.25 元', date: '2026-01-15', url: 'https://finance.ettoday.net/news/3101599' },
    tsmcY25Ctee: { label: '工商時報：台積電 2025 年營收 3 兆 8,090 億元（年增 31.6%）、毛利率 59.9%、稅後純益 1 兆 7,178 億元', date: '2026-01-15', url: 'https://www.ctee.com.tw/news/20260115701196-430501' },
    tsmcCash25: { label: '工商時報：台積電 2025 年營運現金流約 2.3 兆元、資本支出約 1.3 兆元、自由現金流約 1 兆元', date: '2026-01-16', url: 'https://www.ctee.com.tw/news/20260116700070-439901' },
    tsmcDebt24: { label: '今周刊：台積電 2024 年底負債比率 35.39%，連續三年下降', date: '2025-03-05', url: 'https://www.businesstoday.com.tw/article/category/183008/post/202503050071/' },
    tsmcQ1: { label: '鉅亨網：台積電 2026 年第一季每股盈餘 22.08 元、毛利率 66.2%', date: '2026-04-16', url: 'https://news.cnyes.com/news/id/6422285' },
    tsmcQ1Pr: { label: '台積電新聞稿：2026 年第一季每股盈餘 22.08 元', date: '2026-04-16', url: 'https://pr.tsmc.com/chinese/news/3311' },
    tsmcQ1Price: { label: '優分析：台積電法說後尾盤下殺至 2,030 元，跌逾 2%', date: '2026-04-17', url: 'https://uanalyze.com.tw/articles/7427550810' },
    tsmcQ2: { label: '科技新報：台積電 2026 年第二季每股盈餘 27.25 元', date: '2026-07-16', url: 'https://finance.technews.tw/2026/07/16/tsmcs-second-quarter-revenue-and-net-profit-both-exceeded-expectations/' },
    tsmcQ3: { label: '科技新報：台積電 2026 年第三季營收約 1 兆 4,942 億元、毛利率 66.4%、營益率 58.7%、稅後純益約 7,631 億元、每股盈餘 29.43 元', date: '2026-10-15', url: 'https://finance.technews.tw/2026/10/15/tsmcs-third-quarter-eps-hit-a-new-high-of-nt29-43/' },
    tsmcQ3_25: { label: '經濟日報：台積電 2025 年第三季每股盈餘 17.44 元', date: '2025-10-16', url: 'https://money.udn.com/money/amp/story/5607/9074275' },
    tsmcSep: { label: '科技新報：台積電 9 月營收 5,118.57 億元，月增 −0.6%、年增 54.7%；前 9 月 3.90 兆元，年增 41.1%', date: '2026-10-08', url: 'https://finance.technews.tw/2026/10/08/tsmc-2330-202609-financial-report/' },
    hhSep: { label: '科技新報：鴻海 9 月營收 1.16 兆元，月增 25.7%、年增 38.4%；前 9 月 7.67 兆元，年增 39.5%', date: '2026-10-05', url: 'https://finance.technews.tw/2026/10/05/hon-hai-2317-202609-financial-report/' },
    hhQ2: { label: '口袋學堂：鴻海 2026 年第二季毛利率 6.12%、營益率 3.75%', date: '2026-08-12', url: 'https://www.pocket.tw/school/articles/7768/' },
    revenueRule: { label: '全國法規資料庫《證券交易法》第 36 條：每月 10 日以前公告並申報上月營運情形', url: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0400001&flno=36' },
    evr2122: { label: '鉅亨網：長榮歷年獲利（2021 年 EPS 45.57 元、2022 年 87.07 元）', url: 'https://news.cnyes.com/news/id/5338654' },
    evr23: { label: '鉅亨網：長榮歷年獲利（2023 年 EPS 16.7 元）', url: 'https://news.cnyes.com/news/id/5732147' },
    evr24: { label: 'Yahoo 股市（財訊快報）：長榮 2024 年每股盈餘 64.87 元', date: '2025-03', url: 'https://tw.stock.yahoo.com/news/%E9%95%B7%E6%A6%AE%E5%8E%BB%E5%B9%B4%E8%B3%BA%E9%80%BE6%E8%82%A1%E6%9C%AC-eps-64-87%E5%85%83-%E6%93%AC%E9%85%8D%E6%81%AF32-233241441.html' },
    evr25: { label: '工商時報：長榮 2025 年每股盈餘 31.68 元，稅後純益年減 50.82%，配息 16 元', date: '2026-03-14', url: 'https://www.ctee.com.tw/news/20260314700054-430503' },
    evr25Yield: { label: '時報資訊：長榮以 3/13 收盤價 207.5 元計算，殖利率約 7.7%', date: '2026-03-13', url: 'https://wantrich.chinatimes.com/news/20260313900653-420101' },
    ma1018: { label: '今周刊：台積電 10/16 收 2,420 元，面臨季線 2,420 元保衛戰；外資近六個交易日累計賣超逾 11 萬張', date: '2026-10-18', url: 'https://www.businesstoday.com.tw/article/category/183008/post/202610180009/' },
    foreign: { label: 'EBC 金融：截至 2026/9/15，台積電外資持股約 69.21%', date: '2026-09-15', url: 'https://www.ebc.com/zh/jinrong/312146.html' },
    sox0716: { label: 'HiStock 嗨投資：費城半導體指數歷史行情，2026/7/16 收 11,867.5 點（−4.29%）', date: '2026-07-16', url: 'https://histock.tw/index/SOX' },
    etf0050: { label: '元大投信 0050 基本資料：2003/06/30 掛牌，追蹤臺灣50指數', url: 'https://www.yuantaetfs.com/product/detail/0050/Basic_information' },
    w0050: { label: '今周刊：0050 成分股中台積電權重 60.39%', date: '2026-05-06', url: 'https://www.businesstoday.com.tw/article/category/183013/post/202605060037/' },
    div0050Jan: { label: '今周刊：0050 配息 1 元', date: '2026-01-03', url: 'https://www.businesstoday.com.tw/article/category/183013/post/202601030003/' },
    holders0050: { label: 'ETtoday 財經雲：「323 萬股民注意！0050 配 0.6 元，7/21 除息」', date: '2026-07', url: 'https://finance.ettoday.net/news/3193281' },
    etf0056: { label: '元大投信 0056 基本資料：2007/12/26 掛牌，挑預測現金殖利率最高的 50 家', url: 'https://www.yuantaetfs.com/product/detail/0056/' },
    d0056q3: { label: '聯合報：0056 擬配 1.35 元，創季配新高', date: '2026-07', url: 'https://udn.com/news/story/123006/9600517' },
    d0056q4: { label: '優分析：0056 第四季預估配 1.72 元，受益人約 166 萬人', date: '2026-10', url: 'https://uanalyze.com.tw/articles/4016056297' },
    dca: { label: '自由財經：8 月定期定額戶數，0050 破 128 萬、0056 破 33.8 萬；00878 約 31.3 萬、006208 約 25.7 萬（證交所資料）', date: '2026-08', url: 'https://ec.ltn.com.tw/article/breakingnews/5568234' },
    margin: { label: 'Money101：融資、維持率、追繳與斷頭說明', url: 'https://www.money101.com.tw/blog/%E8%9E%8D%E8%B3%87-%E8%9E%8D%E8%B3%87%E6%96%B7%E9%A0%AD-%E8%9E%8D%E8%B3%87%E7%B6%AD%E6%8C%81%E7%8E%87-%E8%9E%8D%E8%B3%87%E8%BF%BD%E7%B9%B3%E4%BB%A4-%E8%82%A1%E7%A5%A8' },
    marginRule: { label: '口袋學堂：融資融券規則（上市股票融資成數上限 60%、整戶擔保維持率低於 130% 追繳）', url: 'https://www.pocket.tw/school/articles/4247/' },

    // ---- 第 3 週：看盤 App 和技術指標 ----
    futuColor: { label: '富途牛牛幫助中心：報價圖表可在「設定 > 報價設定 > 升跌顏色」改成綠漲紅跌', url: 'https://support.futunn.com/hant/topic76' },
    futuMa: { label: '富途牛牛幫助中心：MA5、MA10、MA20、MA60 分別對應 5 日、10 日、20 日、60 日的股價移動平均線', url: 'https://support.futunn.com/topic252' },
    pocketKD: { label: '口袋學堂：KD 指標參數一般設為 (9,3,3)；RSV、K、D 的算法；80 以上超買、20 以下超賣', url: 'https://www.pocket.tw/school/articles/4233/' },
    pocketInd: { label: '口袋學堂：RSI 市場預設 14 天，70 以上超買、30 以下超賣；連續多日 >80 或 <20 為鈍化，交叉訊號可能失效', url: 'https://www.pocket.tw/school/articles/5267/' },
    futuRsi: { label: '富途牛牛幫助中心：RSI 三條線為 6、12、24 日；80 以上超買、20 以下超賣', url: 'https://support.futunn.com/topic251' },
    futuMacd: { label: '富途牛牛幫助中心：MACD 的 DIF＝12 日 EMA 減 26 日 EMA；DIF 向上突破慢線為買進信號、向下跌破為賣出信號', url: 'https://support.futunn.com/hant/topic165' },
    boll: { label: 'John Bollinger 官網：布林通道預設 20 期均線、上下 ±2 個標準差', url: 'https://www.bollingerbands.com/bollinger-bands' },
    bollPct: { label: 'StockCharts ChartSchool：依 Bollinger 的說法，通道大約包含 88～89% 的價格', url: 'https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-overlays/bollinger-bands' },
    tw0409: { label: '經濟日報：2025/4/9 加權指數收 17,391.76 點（−1,068.19 點），為全年最低收盤；4/7～4/9 三天共跌 3,906.46 點', date: '2025-12-31', url: 'https://money.udn.com/money/story/5607/9237541' },
    tsmcTarget: { label: '經濟日報：台積電法說後 10/16 收 2,420 元（−20 元）；內外資目標價包括 Aletheia 5,000 元、花旗 4,000 元、滙豐 3,800 元、野村 3,745 元、美銀 3,260 元、法巴 3,090 元', date: '2026-10-16', url: 'https://udn.com/news/story/7252/9819470' },
    usHours: { label: 'Nasdaq：美股正常交易時間為美東時間 9:30～16:00', url: 'https://www.nasdaq.com/market-activity/stock-market-holiday-schedule' },
    usExt: { label: 'Fidelity：盤前 4:00～9:30、盤後 16:00～20:00（美東時間），各券商開放的時段可能更短', url: 'https://www.fidelity.com/learning-center/smart-money/stock-market-hours' },
    dst2026: { label: '口袋學堂：2026 年美股台灣時間夏令 21:30 開盤，11 月 1 日轉冬令延後到 22:30', date: '2026', url: 'https://www.pocket.tw/school/articles/3319/' },
    futuNight: { label: '富途證券（香港）幫助中心：美股夜盤為週日到週四 20:00～次日 04:00（美東時間），只能用限價單', url: 'https://www.futuhk.com/hans/support/topic2_707' },
    closed1023: { label: '經濟日報：證交所宣布台股 10/23 颱風休市、10/26 光復節補假，27 日才開盤', date: '2026-10-22', url: 'https://money.udn.com/money/story/5607/9832123' },

    // ---- 第 4～5 週：長期投資 ----
    tw2008: { label: '臺灣證券交易所六十週年專刊：2008 年加權指數 5/19 最高 9,295.20 點、11/20 最低 4,089.93 點', url: 'https://www.twse.com.tw/staticFiles/product/publication/twse60/html/174/' },
    tw2022: { label: '中央社：2022 年加權指數收 14,137.69 點，全年跌 22.4%；最高 1/5 的 18,619.61 點、最低 10/25 的 12,629.48 點', date: '2022-12-30', url: 'https://www.cna.com.tw/news/afe/202212300176.aspx' },
    tw2023: { label: '中央社：2023 年加權指數收 17,930.81 點，全年漲 26.83%', date: '2024-01', url: 'https://www.cna.com.tw/news/afe/202401040258.aspx' },
    tw2024: { label: '中央社：2024 年加權指數收 23,035.10 點，漲幅 28.47%', date: '2024-12-31', url: 'https://www.cna.com.tw/news/afe/202412310232.aspx' },
    tw2025: { label: '經濟日報：2025 年加權指數收 28,963.60 點，全年漲 25.74%', date: '2025-12-31', url: 'https://money.udn.com/money/story/5607/9237537' },
    jpmIntra: { label: '摩根資產管理《Guide to the Markets》2026 年第 4 季版：1980～2025 年標普 500 年內平均最大跌幅 14.2%，46 年中有 35 年全年上漲（只算價格）', date: '2026-09-30', url: 'https://am.jpmorgan.com/content/dam/jpm-am-aem/global/en/insights/market-insights/guide-to-the-markets/mi-guide-to-the-markets-us.pdf' },
    jpmBest: { label: 'CNBC 引用摩根資產管理：2005/1/3～2024/12/31 投資標普 500 一萬美元，全程持有變 71,750 美元，錯過最好的 10 天只剩 32,871 美元；最好的 10 天有 7 天在最差的 10 天前後兩週內', date: '2025-04-07', url: 'https://www.cnbc.com/2025/04/07/selling-out-during-the-markets-worst-days-can-hurt-you-research.html' },
    spiva: { label: 'S&P 道瓊指數 SPIVA 美國報告：2025 年 79% 的大型股主動基金落後標普 500；5 年期 89% 落後', date: '2025-12-31', url: 'https://www.spglobal.com/spdji/en/spiva/article/spiva-us/' },
    etf0050ret: { label: '工商時報：0050 自 2003/6/25 成立至 2026 年 5 月底，含息報酬率 2208%，年化約 14.94%', date: '2026-06-01', url: 'https://www.ctee.com.tw/news/20260601701736-430402' },
    fee0050: { label: '科技新報：0050 經理費改為級距式，1,000 億元以下 0.15%，往上分段降到 1 兆元以上 0.05%', date: '2025-01-23', url: 'https://technews.tw/2025/01/23/expense-rate/' },
    fee0050now: { label: '工商時報：0050 規模約 2 兆元，經理費率已降至約 0.0725%', date: '2026-06', url: 'https://www.ctee.com.tw/news/20260601701893-430403' },
    voo: { label: 'Vanguard：VOO（追蹤標普 500）總費用率 0.03%', date: '2026-09-30', url: 'https://advisors.vanguard.com/investments/products/voo/vanguard-sp-500-etf' },
    vt: { label: 'Vanguard：VT（全世界股票 ETF）總費用率 0.06%', date: '2026-09-30', url: 'https://advisors.vanguard.com/investments/products/vt/vanguard-total-world-stock-etf' },
    irs515: { label: '美國國稅局 Publication 515：付給非美國人的美國來源股利，原則上預扣 30%', date: '2026', url: 'https://www.irs.gov/publications/p515' },
    vanguardLS: { label: 'Vanguard 研究〈Cost averaging: Invest now or temporarily hold your cash?〉：一次投入大約三分之二的時間贏過分批投入', date: '2023-02', url: 'https://corporate.vanguard.com/content/dam/corp/research/pdf/cost_averaging_invest_now_or_temporarily_hold_your_cash.pdf' },
    fed2022a: { label: '美國聯準會聲明：利率目標區間維持 0～0.25%', date: '2022-01-26', url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20220126a.htm' },
    fed2022b: { label: '美國聯準會聲明：利率目標區間升至 4.25%～4.5%', date: '2022-12-14', url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20221214a.htm' },
    spx2022: { label: '美聯社：2022 年標普 500 跌 19.4%（含股利 −18.1%），那斯達克跌 33.1%', date: '2022-12-30', url: 'https://www.wxyz.com/news/national/s-p-500-closes-out-dismal-year-with-worst-loss-since-2008' },
    fed0916: { label: '美國聯準會聲明：升息 0.25 個百分點，利率目標區間 3.75%～4%', date: '2026-09-16', url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm' },
    cbc0618: { label: '自由財經：央行理監事會維持重貼現率 2%', date: '2026-06-18', url: 'https://ec.ltn.com.tw/article/breakingnews/5476654' },
    lights08: { label: '優分析：2026 年 8 月景氣對策信號 41 分，連續第 9 顆紅燈', date: '2026-09', url: 'https://uanalyze.com.tw/articles/2358656132' },
    factset1023: { label: 'FactSet：標普 500 未來 12 個月本益比 18.7 倍，5 年平均 19.8 倍、10 年平均 19.1 倍', date: '2026-10-23', url: 'https://insight.factset.com/sp-500-earnings-season-update-october-23-2026' },

    // ---- 第 5 週：美股和看盤 App ----
    futuPE: { label: 'moomoo 學習中心〈如何正確運用市盈率〉：市盈率分為靜態、TTM（過去 12 個月）和動態；靜態用上一個財年的淨利，TTM 用過去 12 個月的淨利', url: 'https://www.moomoo.com/us/hans/learn/how-to-use-the-p-e-ratio-correctly' },
    futuPE2: { label: '富途牛牛：TTM 滾動市盈率＝股價 ÷ 最近四個季度的每股收益；動態市盈率用預測的獲利', url: 'https://news.futunn.com/en/post/3420353' },
    twsePE: { label: '臺灣證券交易所「個股日本益比、殖利率及股價淨值比」：本益比用最近四季每股稅後純益計算，虧損時不計算', url: 'https://www.twse.com.tw/zh/trading/historical/bwibbu-day.html' },
    futuQuoteColor: { label: '富途牛牛幫助中心：報價的漲跌顏色跟昨收比，K 線的顏色跟當天開盤比', url: 'https://support.futunn.com/topic40' },
    msStars: { label: 'Morningstar：星等拿股價跟公允價值比，4～5 星代表股價明顯低於公允價值、3 星接近、1～2 星明顯高於；每天收盤後重算', url: 'https://www.morningstar.com/stocks/how-determine-whether-stock-is-cheap-expensive-or-fairly-valued' },
    msMoat: { label: 'Morningstar 股票研究方法：寬護城河＝非常有把握超額報酬能維持 10 年以上；窄護城河＝比較可能維持 10 年', url: 'https://www.morningstar.com/content/dam/marketing/shared/research/methodology/705988Morningstar_Equity_Research_Methodology.pdf' },
    msMoat5: { label: 'Morningstar：護城河的五種來源，成本優勢、無形資產、轉換成本、規模效率、網路效應', url: 'https://www.morningstar.com/portfolios/economic-moats-matter-heres-evidence' },
    msUnc: { label: 'Morningstar：不確定性評等分五級，越不確定，股價要比公允價值低越多才拿得到 5 星', url: 'https://www.morningstar.com/stocks/an-introduction-morningstar-uncertainty-rating' },
    tiger2017: { label: '科技新報：金管會證期局表示老虎證券在台招攬屬非法，投資人與非法業者有糾紛時，無法獲得金融消費者應有的保障', date: '2017-03-08', url: 'https://finance.technews.tw/2017/03/08/tiger-brokers-is-illegally-launched-in-taiwan/' },
    etoro2020: { label: '科技新報：金管會表示 eToro 等業者透過網路平台招攬國人投資，已移送檢調偵辦', date: '2020-07-14', url: 'https://finance.technews.tw/2020/07/14/etoro-llegal-in-taiwan/' },
    csrc0522: { label: '星島：中國證監會處罰老虎、富途、長橋，涉非法跨境經營', date: '2026-05-22', url: 'https://www.stheadline.com/stock-market/3575290/' },
    subFee: { label: '口袋證券〈2026 複委託懶人包〉：複委託開戶和糾紛在台灣處理；費率約 0.1%～0.5%，多數每筆最低 15～30 美元', date: '2026-05-20', url: 'https://www.pocket.tw/school/articles/7457/' },
    usEstate: { label: '今周刊：不管用美國券商直接開戶還是台灣券商複委託，美股都在美國遺產稅的課稅範圍', date: '2026-01-13', url: 'https://www.businesstoday.com.tw/article/category/183022/post/202601130002/' },
    treaty: { label: 'Taxes for Expats：美台避免雙重課稅法案到 2026 年 4 月仍未生效', date: '2026-04', url: 'https://www.taxesforexpats.com/country-guides/taiwan/us-taiwan-tax-treaty.html' },
    amt115: { label: '財政部令：115 年度個人基本所得額在 750 萬元以下免繳；超過的部分按 20% 計算基本稅額', date: '2025-11-19', url: 'https://www.rootlaw.com.tw/LetterContent.aspx?LCode=12&SOID=255496' },
    amtOverseas: { label: '聯合報（高雄國稅局說明）：海外所得一申報戶全年未滿 100 萬元免計入，100 萬元以上全數計入；海外所得要自行申報', date: '2026', url: 'https://udn.com/news/story/7243/9367169' }
  };

  var TOOLS = '<a href="tools.html">實戰工具</a>';

  window.LESSONS = [

    // ===================== 第 1 週：速成基礎＋開戶下單 =====================

    {
      day: 1, week: 1,
      title: '股票、股價、市值，再去開戶',
      goal: '用 5 分鐘搞懂股票、股價、市值三件事，然後今天就把證券戶申請送出去。',
      explain: `
<p><b class="term">股票</b>是公司的一小塊。買了，你就是<b class="term">股東</b>：公司賺錢你有機會分到，公司變值錢你手上那一塊也變值錢；反過來也一樣。</p>
<p class="term-note"><b>股票</b>＝公司的一小塊所有權，像披薩切成很多片，你買到其中一片。<br><b>股東</b>＝擁有股票的人，像合資開店的出資者。</p>
<p><b class="term">股價</b>由想買和想賣的人一起決定。想買的人多就漲，想賣的人多就跌。公司一個晚上沒什麼變化，股價也可能差很多。台股顏色跟美國相反：<span class="up">紅色是漲</span>、<span class="down">綠色是跌</span>。</p>
<p class="term-note"><b>股價</b>＝一股現在大家願意用多少錢買賣，像二手市集的行情價。</p>
<p>比公司大小要看<b class="term">市值</b>，不是看股價。</p>
<p class="term-note"><b>市值</b>＝股價 × 總股數。像一棟樓每戶的行情價乘上總戶數。</p>
<p>要自己下單，需要兩個戶頭：在券商開的<b>證券戶</b>（下單用），加上一個銀行的<b>交割戶</b>（扣款、收錢用）。</p>`,
      example: {
        name: '台積電', code: '2330',
        body: `
<ul>
<li>總股數約 <b>259 億股</b>；2026 年 4 月初股東約 <b>256 萬人</b>。</li>
<li>股價：2026/10/21 收 2,420 元，10/22 收 2,385 元，一天差 35 元。</li>
<li>市值：2026/9/23 收 2,500 元時，報導算出 <b>64.83 兆元</b>（2,500 × 約 259.32 億股）。用 10/22 的 2,385 元算，約 61.8 兆元。</li>
</ul>
<p>不到一個月市值少了約 3 兆，台積電一座工廠也沒少。市值是大家的出價，不是公司的磚頭。</p>`,
        sources: [S.tsmcShares, S.tsmcHolders, S.close1021, S.close1022, S.mcap0923]
      },
      practice: `
<p>今天的任務：把開戶申請送出去，並先定好你的練習資金。</p>
<ol>
<li>挑一家券商的 App 線上開戶。比較三件事：電子下單手續費打幾折、<b>零股最低手續費</b>是 1 元還是 20 元、App 好不好用。</li>
<li>準備身分證、第二證件（健保卡或駕照），以及一個要綁成交割戶的銀行帳戶。年滿 18 歲可以自己開。</li>
<li>送出申請。線上填寫大約 5～10 分鐘，審核通常要 1～3 天，所以今天就先送。</li>
<li>寫下你的<b>練習資金上限</b>：一筆就算全部賠光，也不影響生活費的錢。第一個月所有真實下單，加起來都不能超過它。</li>
</ol>`,
      practiceSources: [S.open, S.openDays, S.age18, S.oddFee],
      question: 'A 公司股價 500 元、有 1 億股；B 公司股價 50 元、有 20 億股。哪家比較大？',
      answer: `<p>A：500 × 1 億 ＝ 500 億。B：50 × 20 億 ＝ 1,000 億。B 股價低，市值卻是 A 的兩倍。比大小看市值。</p>`,
      points: [
        '股票是公司的一小塊；股價由買賣雙方決定，紅漲綠跌。',
        '比公司大小看市值（股價 × 總股數），不是看股價。',
        '開戶要證券戶加交割戶；先定好練習資金上限。'
      ]
    },

    {
      day: 2, week: 1,
      title: '交易規則：張、零股、時間、漲跌停',
      goal: '搞懂一次能買多少、什麼時候能買、一天最多漲跌多少，還有價格一格跳多少。',
      explain: `
<p class="term-note"><b>張</b>＝1,000 股，像一整盒雞蛋。<br><b>零股</b>＝1～999 股，像只買幾顆。新手用零股練習最剛好。</p>
<p><b>交易時間</b>（週一到週五）：</p>
<ul>
<li>一般交易和盤中零股：9:00～13:30。盤中零股 9:10 第一次撮合，之後每 5 秒撮合一次。</li>
<li>盤後零股：13:40～14:30 下單，14:30 一次撮合。</li>
</ul>
<p class="term-note"><b>撮合</b>＝交易所把買單和賣單配對，價錢談得攏就成交，像交友配對。</p>
<p><b class="term">漲跌停</b>：一天最多比前一天收盤價漲或跌 10%（2015/6/1 起）。</p>
<p><b class="term">升降單位</b>：股價不是每一分錢都能喊，一格跳多少看價位。一般股票：未滿 10 元一格 0.01 元、10～50 元 0.05 元、50～100 元 0.1 元、100～500 元 0.5 元、500～1,000 元 1 元、1,000 元以上 5 元。ETF 簡單一點：未滿 50 元 0.01 元，50 元以上 0.05 元。</p>
<p class="term-note"><b>升降單位</b>＝價格最小能跳的一格，像尺上的刻度。漲停價算出來如果不在刻度上，就往下取到最近的一格；跌停價往上取。</p>`,
      example: {
        name: '台積電 2026/7/31 漲停', code: '2330',
        body: `
<p>那天台積電以漲停 <b>2,425 元</b>收盤，上漲 220 元，所以前一天收盤是 2,205 元。</p>
<ul>
<li>2,205 × 1.1 ＝ 2,425.5 元。</li>
<li>1,000 元以上一格是 5 元，2,425.5 不在刻度上，往下取到 <b>2,425 元</b>，正好就是報導寫的漲停價。</li>
</ul>
<p>同一天台股大漲 3,186 點，報導說台積電一檔就貢獻了大約 1,748 點。</p>`,
        sources: [S.up0731, S.up0731b, S.tick, S.limit10]
      },
      practice: `
<ol>
<li>打開 Yahoo 股市或券商 App，搜尋 2330，找到「昨收」。</li>
<li>打開本站的${TOOLS}，用「漲跌停價」算出今天的漲停價和跌停價。</li>
<li>對照 App 上顯示的漲停、跌停價，看你算的對不對。</li>
<li>再對 0050 做一次。0050 是 ETF，升降單位跟股票不一樣，算出來的價格會落在 0.05 元的刻度上。</li>
</ol>`,
      practiceSources: [S.oddLot, S.oddLot5s, S.afterOdd, S.lotSize],
      question: '某股票昨天收 139.5 元，今天的漲停價是多少？',
      answer: `<p>139.5 × 1.1 ＝ 153.45 元。100～500 元一格是 0.5 元，153.45 不在刻度上，往下取到 <b>153 元</b>。所以漲停價是 153 元，不是 153.45 元。</p>`,
      points: [
        '1 張 1,000 股，零股 1～999 股；交易時間 9:00～13:30。',
        '一天最多漲跌 10%，漲停價往下取、跌停價往上取到升降單位。',
        '價格一格跳多少看價位，ETF 跟股票的規則不同。'
      ]
    },

    {
      day: 3, week: 1,
      title: '看盤：報價畫面、成交量、五檔',
      goal: '打開任何一個看盤 App，你要看得懂上面每一個數字。',
      explain: `
<p>每檔股票的報價畫面，大致都有這些：</p>
<ul>
<li><b>開盤、最高、最低、成交（收盤）</b>：今天第一筆、最貴、最便宜、最新一筆的價格。</li>
<li><b>昨收、漲跌、漲跌幅</b>：跟昨天收盤比，差多少元、差百分之幾。</li>
<li><b>成交量</b>：今天成交了多少（整股看「張」）。量越大，代表越多人在買賣。</li>
</ul>
<p class="term-note"><b>成交量</b>＝今天換手了多少張。像夜市攤位今天賣了幾份，人潮多才賣得多。</p>
<p><b class="term">五檔</b>是買賣雙方排隊的隊伍：</p>
<p class="term-note"><b>五檔</b>＝目前出價最高的 5 個買價（委買）和最低的 5 個賣價（委賣），以及各排了多少張。像拍賣會上，最想買的人和最想賣的人各站前五排。</p>
<p>委買最高價和委賣最低價中間的差距叫<b>價差</b>。熱門股價差通常只有一格；冷門股價差大，你一買一賣就先虧在價差上。</p>`,
      example: {
        name: '台積電 2026/10/22', code: '2330',
        body: `
<p>新聞標題寫「台股震盪 1,290 點險守 46K，台積電跌 35 元<b>收最低</b> 2,385」。用報價畫面的語言翻譯：</p>
<ul>
<li><b>成交（收盤）</b>：2,385 元。</li>
<li><b>漲跌</b>：−35 元（昨收 2,420 元），約 −1.45%。</li>
<li><b>最低</b>：也是 2,385 元。收在最低價，代表賣壓一路到收盤都沒停。</li>
<li>那天大盤一天之內上下震盪了 1,290 點，最後收跌 846.34 點。</li>
</ul>`,
        sources: [S.close1022, S.close1021, S.taiex1022]
      },
      practice: `
<p>開盤時間（9:00～13:30）做：</p>
<ol>
<li>打開 0050 的報價畫面，記下開盤、最高、最低、成交、成交量。</li>
<li>看五檔：委買最高價、委賣最低價各是多少？中間差幾格？</li>
<li>切到「零股」報價（多數 App 有這個切換）。零股的五檔跟整股一樣嗎？通常零股價差比較大。</li>
<li>收盤後再看一次，跟你早上記的比，寫一句「今天 0050 怎麼走的」。</li>
</ol>`,
      question: '一檔股票委買最高 50.0 元，委賣最低 51.5 元。你用馬上買得到的價格買、再馬上賣掉，會怎樣？',
      answer: `<p>馬上買得到的是 51.5 元（別人掛的賣價），馬上賣得掉的是 50.0 元（別人掛的買價）。一來一回每股就先少 1.5 元，還沒算手續費。冷門股價差大，新手要避開。</p>`,
      points: [
        '開高低收、昨收、漲跌、成交量，是報價畫面的基本款。',
        '五檔是買賣雙方排隊的前五排，看得出誰比較急。',
        '價差大的冷門股，一買一賣就先虧。'
      ]
    },

    {
      day: 4, week: 1,
      title: '大盤指數：點數怎麼換算成漲跌幅',
      goal: '聽到「台股漲 1,000 點」時，你能馬上換算成百分之幾，知道對自己的錢有多大影響。',
      explain: `
<p>新聞說的「台股漲幾點」，是指<b class="term">加權指數</b>，也叫<b>大盤</b>。</p>
<p class="term-note"><b>加權指數</b>＝把所有上市股票算成一個分數，市值越大的公司影響越大。像算學期成績，學分多的科目比較重。1966 年從 100 點開始算。</p>
<p>點數本身不重要，<b>百分比</b>才重要：</p>
<p><b>漲跌幅 ＝ 漲跌點數 ÷ 前一天收盤指數 × 100%</b></p>
<p>指數越高，同樣的點數代表的幅度越小。指數 2 萬點時，1,000 點是 5%；4.6 萬點時，1,000 點只有約 2.2%。</p>
<p>因為每檔股票一天最多漲跌 10%，大盤一天最多也只能動大約 10%。在 4.6 萬點附近，大約是 4,600 點。所以「一天漲跌一萬點」以現在的規則不會發生。</p>`,
      example: {
        name: '加權指數的幾個紀錄',
        body: `
<div class="table-wrap"><table>
<thead><tr><th>日期</th><th class="num">漲跌點數</th><th class="num">漲跌幅</th><th class="num">收盤</th></tr></thead>
<tbody>
<tr><td>2025/4/7</td><td class="num"><span class="down">−2,065.87</span></td><td class="num"><span class="down">約 −9.7%</span></td><td class="num">19,232.35</td></tr>
<tr><td>2026/7/17</td><td class="num"><span class="down">−2,953.71</span></td><td class="num"><span class="down">−6.47%</span></td><td class="num">42,671.27</td></tr>
<tr><td>2026/7/31</td><td class="num"><span class="up">+3,186.45</span></td><td class="num"><span class="up">+7.98%</span></td><td class="num">43,119.75</td></tr>
<tr><td>2026/10/22</td><td class="num"><span class="down">−846.34</span></td><td class="num"><span class="down">−1.81%</span></td><td class="num">46,041.43</td></tr>
</tbody></table></div>
<p>2026/7/17 跌的點數比 2025/4/7 多，跌幅反而小，因為指數的起點高了一倍多。</p>`,
        sources: [S.crash0407, S.crash0717, S.rally0731, S.taiex1022, S.taiexBase]
      },
      practice: `
<ol>
<li>今天收盤後，記下加權指數的收盤點數和漲跌點數。</li>
<li>自己算漲跌幅：漲跌點數 ÷（收盤點數 − 漲跌點數）× 100%。跟 App 顯示的比對。</li>
<li>再看 0050 今天漲跌幾 %，跟大盤差多少？</li>
<li>假設你有 10 萬元放在 0050，今天大約賺或賠多少？寫下來。</li>
</ol>`,
      question: '加權指數昨天收 45,000 點，今天跌 900 點。跌了百分之幾？',
      answer: `<p>900 ÷ 45,000 ＝ 2%。如果你手上是跟大盤走勢差不多的 ETF，大約也跌 2%。</p>`,
      points: [
        '大盤是加權指數，市值大的公司影響大。',
        '看百分比不看點數：點數 ÷ 前一天收盤。',
        '大盤一天最多動大約 10%，現在約 4,600 點。'
      ]
    },

    {
      day: 5, week: 1,
      title: '下單：限價、市價、ROD／IOC／FOK',
      goal: '學會下單畫面上每一個選項，並且親手掛一張單、再把它刪掉。',
      explain: `
<p>下單時要選兩件事：<b>用什麼價格</b>、<b>這張單有效多久</b>。</p>
<p class="term-note"><b>限價</b>＝自己指定價格，只在這個價格或更好的價格成交。像網購設定「降到 500 元以下才買」。<br><b>市價</b>＝不指定價格，有人賣就買。成交快，但可能買在你沒想到的價格。</p>
<p class="term-note"><b>ROD</b>＝當天有效，沒成交就一直掛到收盤。<br><b>IOC</b>＝馬上能成交多少就成交多少，剩下的取消。<br><b>FOK</b>＝要嘛全部馬上成交，要嘛全部取消。</p>
<p>台股 2020/3/23 起改成<b>逐筆交易</b>，盤中買賣單可以馬上配對。但開盤和收盤前那段時間，只能用「限價 ROD」。盤中零股也只能用限價 ROD。</p>
<p>新手記一條就好：<b>永遠用限價 ROD</b>。</p>
<p>還要分清楚：<b>委託</b>是你把單送出去，<b>成交</b>是真的買到了。委託了不一定會成交；還沒成交的單，可以改價或刪單。</p>`,
      example: {
        name: '市價單為什麼危險',
        body: `
<p>2026/7/17 台股大跌那天，有 135 家公司跌停。這種日子，五檔裡的買單可能一下子被賣光，一張市價賣單就可能一路往下賣到很低的價格。</p>
<p>同一天，台積電一天跌了 180 元（−7.29%）。如果你在恐慌中丟市價單，成交價可能比你看到的報價低很多。用限價單，至少成交價不會比你設的差。</p>`,
        sources: [S.orders, S.oddLotRod, S.crash0717Tvbs, S.crash0717]
      },
      practice: `
<p>如果你的證券戶已經開好，盤中做這個練習（還沒開好就先在 App 裡把畫面找出來）：</p>
<ol>
<li>進入下單畫面，切到<b>零股</b>，選 0050，數量 1 股。</li>
<li>價格類型選<b>限價</b>，條件選 <b>ROD</b>，價格填今天的<b>跌停價</b>（第 2 課算過）。這個價格幾乎不會成交。</li>
<li>送出後，到「委託查詢」確認這張單在排隊、還沒成交。</li>
<li>按「刪單」把它刪掉，再確認狀態變成已取消。</li>
</ol>
<p>這樣你就走過「委託 → 查詢 → 刪單」一遍，真的要買的時候不會手忙腳亂。</p>`,
      question: '你想買某檔股票，現在委賣最低 50.5 元。你掛限價 50 元 ROD，會發生什麼事？',
      answer: `<p>不會馬上成交，你的單會排在委買的隊伍裡。如果之後有人願意用 50 元賣，就會成交；到收盤都沒人賣，這張單就自動失效。</p>`,
      points: [
        '限價自己定價格，市價有人賣就買；新手用限價。',
        'ROD 當天有效、IOC 能成交多少算多少、FOK 全部成交或全部取消。',
        '委託不等於成交，沒成交的單可以改或刪。'
      ]
    },

    {
      day: 6, week: 1,
      title: '成本與交割：手續費、交易稅、T+2',
      goal: '下單前先算清楚要付多少錢、什麼時候扣款，絕對不能違約交割。',
      explain: `
<ul>
<li><b>手續費</b>：買、賣各收一次，上限是成交金額的 0.1425%，很多券商電子下單會打折；整股常見最低收 20 元，零股有券商最低 1 元、也有收 20 元的。</li>
<li><b>證券交易稅</b>：只有賣出時收。股票 0.3%，ETF 0.1%。</li>
</ul>
<p>所以就算價格沒變，買了再賣也會小虧。股票來回成本大約是 0.585%（手續費 0.1425% × 2 ＋ 交易稅 0.3%，還沒打折）。</p>
<p class="term-note"><b>交割</b>＝成交後真正付錢、拿到股票。台股是 <b>T+2</b>：成交日後第二個營業日上午 10 點前，交割戶要有足夠的錢。</p>
<p class="term-note"><b>違約交割</b>＝時間到了交割戶的錢不夠。後果很重：券商可以收最高成交金額 7% 的違約金，帳戶會被凍結甚至註銷，還會留下信用紀錄。</p>`,
      example: {
        name: '國巨的真實教訓',
        body: `
<p>2026/6/30，證交所公告有投資人在國巨（2327）發生<b>鉅額違約交割</b>，七家券商通報，合計 3,880 萬元。</p>
<p>2026 年股市大波動時，報導也提到小額違約交割暴增。很多人是先買了才發現錢不夠，或以為賣掉別的股票的錢會先進來。</p>
<p>記住：<b>買之前，錢就要已經在交割戶裡。</b></p>`,
        sources: [S.yageo, S.defaultFee, S.defaultRule, S.t2, S.fees]
      },
      practice: `
<ol>
<li>打開本站的${TOOLS}，用「交易成本」算：用今天的價格買 0050 一到幾股，總共要付多少？</li>
<li>填上你券商的手續費折扣和零股最低手續費（開戶時查過）。如果最低 20 元，你買 100 元的東西，手續費就占 20%。</li>
<li>看計算機算出的<b>損益兩平價</b>：股價要漲到多少，賣掉才不會虧？</li>
<li>確認交割戶裡的錢夠付這筆，並記下 T+2 的扣款日期。</li>
</ol>`,
      practiceSources: [S.oddFee],
      question: '用 100 元買 1 股，後來 110 元賣掉。買和賣的手續費都是最低 20 元。賺還是賠？',
      answer: `<p>價差賺 10 元，手續費付了 40 元，賠 30 元。小額買零股，一定要選零股最低手續費低的券商，或一次買多一點。</p>`,
      points: [
        '手續費買賣都收（上限 0.1425%），交易稅只在賣出收（股票 0.3%、ETF 0.1%）。',
        'T+2 上午 10 點前交割戶要有錢，違約交割後果很重。',
        '下單前先算損益兩平價。'
      ]
    },

    {
      day: 7, week: 1, review: true,
      title: '實戰日：下第一筆零股',
      goal: '用真錢、小金額，把「選標的 → 下單 → 成交 → 記錄」完整走一次。',
      explain: `
<p>第一筆交易的目的<b>不是賺錢</b>，而是把流程走熟。所以規則要先講好：</p>
<ul>
<li><b>只用零股</b>，金額不超過第 1 課寫下的練習資金上限。</li>
<li><b>只用限價 ROD</b>，價格參考五檔，不追高。</li>
<li><b>不融資、不融券、不當沖。</b></li>
<li>買之前先寫下<b>為什麼買</b>，以及<b>什麼情況會賣</b>。</li>
</ul>
<p>標的怎麼挑？第一筆挑你<b>看得懂、成交量大、價差小</b>的。像 0050 這類市值型 ETF，一次買到台灣最大的 50 家公司；或台積電零股，報價熱絡。冷門股價差大，新手第一筆不要碰。</p>`,
      example: {
        name: '元大台灣50', code: '0050',
        body: `
<ul>
<li>2003/6/30 掛牌，追蹤台灣市值前 50 大的上市公司。</li>
<li>2026 年 5 月，台積電在裡面的比重約 60.39%。</li>
<li>2026 年 7 月的報導說 0050 股民約 323 萬人；8 月定期定額人數破 128 萬。</li>
</ul>
<p>人多、成交量大，價差通常很小，適合拿來練習下單。但要知道：買 0050，有六成左右其實是在買台積電。</p>`,
        sources: [S.etf0050, S.w0050, S.holders0050, S.dca]
      },
      practice: `
<ol>
<li>選好標的，盤中打開零股報價，看五檔的委賣最低價。</li>
<li>下單：零股、限價、ROD，價格填委賣最低價（或低一格慢慢等）。</li>
<li>成交後到「成交回報」確認價格和股數。</li>
<li>打開${TOOLS}的「我的交易紀錄」，記下日期、代號、價格、股數，以及<b>買的理由</b>和<b>出場條件</b>。</li>
<li>T+2 確認交割戶扣款成功。</li>
</ol>`,
      question: '你掛了限價買單，到 13:30 都沒成交。接下來會怎樣？你該怎麼辦？',
      answer: `<p>ROD 單收盤後自動失效，錢不會被扣。不用急，明天再看一次五檔重新掛。追著價格一路往上改，是新手最常見的追高方式。</p>`,
      points: [
        '第一筆的目的是走熟流程，不是賺錢。',
        '零股、限價 ROD、小金額、不用槓桿。',
        '每一筆都記下買的理由和出場條件。'
      ]
    },

    // ===================== 第 2 週：看懂公司 =====================

    {
      day: 8, week: 2,
      title: '股利、除息、填息、殖利率',
      goal: '看懂公司怎麼分錢，以及「殖利率高」到底划不划算。',
      explain: `
<p class="term-note"><b>股利</b>＝公司把賺的錢分給股東，像房東收房租。<br><b>除息</b>＝發股利那天，股價先扣掉要發的錢，像蛋糕切一塊送你、剩下的變小。<br><b>填息</b>＝除息後股價漲回原本的價格；漲不回去叫<b>貼息</b>。</p>
<p>所以除息前一天買、隔天領股利，不是白賺：你領到的錢，就是股價被扣掉的錢。要等填息才算真的賺到。</p>
<p class="term-note"><b>殖利率</b>＝一年股利 ÷ 股價。像存 100 元，一年領回多少利息。</p>
<p>殖利率高不一定好。股價大跌時，殖利率會「看起來」變高；而且今年發的錢，不保證明年也有。要看的是：公司能不能一直穩定發。</p>`,
      example: {
        name: '中華電', code: '2412',
        body: `
<p>2026/7/9 除息：</p>
<ul>
<li>除息前一天收 139.5 元，每股發 5.2 元。</li>
<li>除息參考價 139.5 − 5.2 ＝ 134.3 元。</li>
<li>殖利率 5.2 ÷ 139.5 ≈ 3.73%。</li>
</ul>
<p>近五年每股現金股利：4.608、4.702、4.758、5、5.2 元（2022～2026 除息年），每年都比前一年多一點。這種「穩定」，比單一年的殖利率高低更重要。</p>`,
        sources: [S.cht0709, S.chtDivHist]
      },
      practice: `
<ol>
<li>挑你有興趣的一檔股票，在 Yahoo 股市或券商 App 找到「股利政策」頁。</li>
<li>抄下近 5 年的現金股利，看看有沒有忽高忽低、或某一年突然不發。</li>
<li>用今天的股價算殖利率。</li>
<li>查它上一次除息後，花了幾天填息（很多看盤頁有「填息天數」）。</li>
</ol>`,
      question: '一檔股票殖利率 8%，但近三年股利是 10 元、6 元、3 元。你會怎麼看？',
      answer: `<p>股利一年比一年少，8% 可能是因為股價先跌了。明年如果再減，用今天的價格買，實際殖利率會低很多。要先查公司賺的錢是不是也在減少。</p>`,
      points: [
        '除息會從股價扣掉股利，填息才算真的賺。',
        '殖利率 ＝ 一年股利 ÷ 股價，每天都在變。',
        '股利穩不穩，比殖利率高不高重要。'
      ]
    },

    {
      day: 9, week: 2,
      title: 'EPS 和本益比：自己算一次',
      goal: '自己用最近四季的 EPS 算出本益比，不再只聽別人說「貴」或「便宜」。',
      explain: `
<p class="term-note"><b>EPS（每股盈餘）</b>＝公司稅後賺的錢 ÷ 總股數。像一鍋湯平分給每個人，每人分到幾碗。</p>
<p class="term-note"><b>本益比</b>＝股價 ÷ EPS。像花 100 萬頂一家店，店一年賺 10 萬，約 10 年回本，本益比 10 倍。</p>
<p>算本益比最常用<b>最近四季 EPS 加總</b>，叫「近四季本益比」。用不同期間的 EPS，算出來會差很多，所以聽到別人報本益比，要先問用哪一段算的。</p>
<p>本益比高，代表市場預期公司未來會更賺；如果之後賺得不如預期，股價就可能跌得重。同一行的公司互相比、跟自己過去比，才比較有意義。</p>`,
      example: {
        name: '台積電', code: '2330',
        body: `
<div class="table-wrap"><table>
<thead><tr><th>期間</th><th class="num">EPS</th></tr></thead>
<tbody>
<tr><td>2025 第四季</td><td class="num">19.50 元</td></tr>
<tr><td>2026 第一季</td><td class="num">22.08 元</td></tr>
<tr><td>2026 第二季</td><td class="num">27.25 元</td></tr>
<tr><td>2026 第三季</td><td class="num">29.43 元</td></tr>
<tr><td><b>近四季合計</b></td><td class="num"><b>98.26 元</b></td></tr>
</tbody></table></div>
<p>2026/10/22 收 2,385 元：本益比 ≈ 2,385 ÷ 98.26 ≈ <b>24 倍</b>。改用 2025 全年 EPS 66.25 元算，變成約 36 倍。第三季 EPS 比去年同季的 17.44 元多約 68.7%，EPS 成長得很快。</p>`,
        sources: [S.tsmcQ4_25, S.tsmcQ1Pr, S.tsmcQ2, S.tsmcQ3, S.tsmcY25, S.tsmcQ3_25, S.close1022]
      },
      practice: `
<ol>
<li>挑一檔股票，找到它最近四季的 EPS（看盤 App 的「財務」或「EPS」頁）。</li>
<li>加總後，用今天的收盤價算本益比。</li>
<li>跟 App 上顯示的本益比比對。差很多的話，想想它是用哪一段 EPS 算的。</li>
<li>找一家同產業的公司也算一次，兩家放在一起比。</li>
</ol>`,
      question: '兩家同產業的公司本益比都是 15 倍。A 的 EPS 每年成長 30%，B 每年衰退 10%。哪個比較划算？',
      answer: `<p>A。同樣 15 倍，A 未來賺得越來越多，用明年的 EPS 算，本益比會變低；B 越賺越少，用明年的 EPS 算會變高。本益比要搭配 EPS 的方向一起看。</p>`,
      points: [
        'EPS ＝ 稅後賺的錢 ÷ 股數；本益比 ＝ 股價 ÷ EPS。',
        '常用近四季 EPS 算，先問清楚是哪一段。',
        '本益比要跟同業比、跟 EPS 成長方向一起看。'
      ]
    },

    {
      day: 10, week: 2,
      title: '月營收：每月 10 號的成績單',
      goal: '學會去查公司每個月的營收，看懂月增率和年增率。',
      explain: `
<p class="term-note"><b>營收</b>＝公司賣東西收進來的錢，還沒扣成本。像飲料店這個月賣了多少杯的總金額。</p>
<p>台灣上市公司每月 10 日以前，要公布上個月的營收。這是最快的成績單，比季報早很多。</p>
<ul>
<li><b>月增率</b>：跟上個月比，容易受淡旺季影響。</li>
<li><b>年增率</b>：跟去年同月比，比較公平，通常比較重要。</li>
<li><b>累計年增率</b>：今年到目前為止的總和跟去年同期比，看長期方向。</li>
</ul>
<p>營收公布後，股價常會反應。但營收高不等於賺很多，還要看成本，那是下一課的事。</p>`,
      example: {
        name: '台積電 vs 鴻海（2026 年 9 月營收）',
        body: `
<div class="table-wrap"><table>
<thead><tr><th></th><th class="num">9 月營收</th><th class="num">月增</th><th class="num">年增</th><th class="num">前 9 月年增</th></tr></thead>
<tbody>
<tr><td>台積電 2330</td><td class="num">5,118.57 億</td><td class="num">−0.6%</td><td class="num">+54.7%</td><td class="num">+41.1%</td></tr>
<tr><td>鴻海 2317</td><td class="num">約 1.16 兆</td><td class="num">+25.7%</td><td class="num">+38.4%</td><td class="num">+39.5%</td></tr>
</tbody></table></div>
<p>台積電 9 月比 8 月少了一點（月增 −0.6%），但跟去年 9 月比多了五成多。只看月增會以為變差，看年增才知道生意其實很好。</p>`,
        sources: [S.tsmcSep, S.hhSep, S.revenueRule]
      },
      practice: `
<ol>
<li>到「公開資訊觀測站」（證交所的官方公告網站），搜尋公司代號，找「每月營收」。也可以用看盤 App 的「營收」頁。</li>
<li>抄下最近 12 個月的營收和年增率。</li>
<li>看年增率是連續變高、持平，還是一路變低。</li>
<li>每月 10 號前後，查一次你持有或觀察的股票，並記錄營收公布當天股價怎麼反應。</li>
</ol>`,
      question: '某公司營收年增 50%，但連續三個月年增率從 80%、65% 降到 50%。這是好消息還是警訊？',
      answer: `<p>兩者都有。成長還很強，但成長速度在變慢。市場常常在意「變化的方向」，成長放緩時股價可能先反應。要繼續追蹤下個月。</p>`,
      points: [
        '上市公司每月 10 日以前公布上月營收。',
        '年增率比月增率公平；也要看累計年增率。',
        '營收是生意忙不忙，賺不賺錢還要看成本。'
      ]
    },

    {
      day: 11, week: 2,
      title: '損益表：毛利率、營益率、淨利率',
      goal: '用三個比率看出一家公司「好不好賺」，以及錢在哪一關被花掉。',
      explain: `
<p>損益表從營收一路往下扣，每一關剩下多少，就是三個比率：</p>
<ul>
<li><b>毛利率</b>：營收扣掉做產品的直接成本，剩多少。</li>
<li><b>營業利益率（營益率）</b>：再扣掉研發、管銷等營運費用，剩多少。</li>
<li><b>淨利率</b>：再扣掉稅和業外損益，最後真正賺到的。</li>
</ul>
<p class="term-note"><b>三率</b>＝每賣 100 元，過了三關各剩幾元。像手搖飲一杯 100 元：扣掉茶葉杯子剩 60（毛利率 60%），再扣店租薪水剩 20（營益率 20%），再扣稅剩 16（淨利率 16%）。</p>
<p>三率同時往上叫「三率三升」，代表越來越會賺。跨產業不要硬比，組裝業和晶片製造的毛利率天生差很多。</p>`,
      example: {
        name: '台積電 vs 鴻海',
        body: `
<div class="table-wrap"><table>
<thead><tr><th></th><th>期間</th><th class="num">毛利率</th><th class="num">營益率</th></tr></thead>
<tbody>
<tr><td>台積電 2330</td><td>2026 第三季</td><td class="num">66.4%</td><td class="num">58.7%</td></tr>
<tr><td>鴻海 2317</td><td>2026 第二季</td><td class="num">6.12%</td><td class="num">3.75%</td></tr>
</tbody></table></div>
<p>台積電第三季營收約 1 兆 4,942 億元、稅後純益約 7,631 億元，淨利率約 51%（7,631 ÷ 14,942）。每賣 100 元，最後留下約 51 元。</p>
<p>鴻海每賣 100 元，扣完直接成本只剩約 6 元。它靠的是非常大的量：9 月單月營收就超過 1 兆。</p>`,
        sources: [S.tsmcQ3, S.hhQ2, S.hhSep]
      },
      practice: `
<ol>
<li>找一家公司最近 8 季的毛利率、營益率、淨利率（看盤 App 的「財務比率」頁）。</li>
<li>畫個簡單的箭頭：三個比率最近是往上、持平還是往下？</li>
<li>找一家同業比較毛利率，誰比較高？想想為什麼。</li>
<li>把結論寫成一句話，存到你的交易紀錄備註裡。</li>
</ol>`,
      question: '一家公司營收年增 20%，但毛利率從 40% 掉到 30%。可能發生了什麼？',
      answer: `<p>可能是降價搶客、原料變貴，或賣了比較多利潤低的產品。營收變多但每 100 元剩的錢變少，獲利不一定跟著增加，要再看營益率和 EPS。</p>`,
      points: [
        '毛利率、營益率、淨利率：每 100 元過三關各剩多少。',
        '三率同時往上，代表越來越會賺。',
        '跟同業比、跟自己過去比，不要跨產業硬比。'
      ]
    },

    {
      day: 12, week: 2,
      title: '負債和現金流：三個避雷檢查',
      goal: '用三個簡單的檢查，避開「帳上賺錢、口袋沒錢」或「借太多錢」的公司。',
      explain: `
<p><b>資產負債表</b>看家當和欠款，<b>現金流量表</b>看現金真的有沒有進來。新手先做三個檢查：</p>
<ol>
<li><b>營業現金流是正的嗎？</b>本業有沒有真的收到現金。帳上賺錢、現金流卻長期是負的，要小心。</li>
<li><b>自由現金流夠不夠？</b>營業現金流扣掉蓋廠、買機器的錢（資本支出）後還剩多少。剩得多，才有錢發股利、度過寒冬。</li>
<li><b>負債比會不會太高？</b>總負債 ÷ 總資產。不同產業標準不同，但一路往上要問為什麼。</li>
</ol>
<p class="term-note"><b>自由現金流</b>＝本業收進的現金，扣掉投資在設備上的錢後剩下的。像薪水扣掉房貸、學費後，真正能自由運用的錢。</p>`,
      example: {
        name: '台積電', code: '2330',
        body: `
<ul>
<li>2025 年營運現金流約 <b>2.3 兆元</b>，資本支出約 1.3 兆元，自由現金流約 <b>1 兆元</b>。</li>
<li>2025 年稅後純益 1 兆 7,178 億元，營運現金流比獲利還多，代表賺的是真金白銀。</li>
<li>2024 年底負債比率 35.39%，連續三年下降。</li>
</ul>
<p>三個檢查都過關。這就是台積電能一季一季調高股利的底氣。</p>`,
        sources: [S.tsmcCash25, S.tsmcY25Ctee, S.tsmcDebt24]
      },
      practice: `
<ol>
<li>挑一家公司，在看盤 App 或公開資訊觀測站找到它近 5 年的營業現金流、資本支出、負債比。</li>
<li>做三個檢查，每一項寫「過」或「不過」。</li>
<li>如果有一項不過，查新聞看看原因，例如正在大舉蓋新廠，或是本業真的收不到錢。</li>
</ol>`,
      question: '一家公司連續三年都有賺錢，但營業現金流三年都是負的。可能是什麼狀況？',
      answer: `<p>可能是貨賣出去了但客戶還沒付錢（應收帳款越堆越多），或庫存越積越多。帳上的獲利沒有變成現金，一旦客戶付不出來就會出事。這是要避開的警訊。</p>`,
      points: [
        '營業現金流是正的，代表本業真的收到錢。',
        '自由現金流夠，才有錢發股利、撐過不景氣。',
        '負債比一路變高，要先問為什麼。'
      ]
    },

    {
      day: 13, week: 2,
      title: '產業性格：成長、穩定、景氣循環',
      goal: '先認出一家公司是哪一種性格，再決定用什麼方法看它。',
      explain: `
<ul>
<li><b>成長股</b>：營收、獲利一年比一年長得快。本益比通常高，期待落空時跌得重。看營收年增率和 EPS 成長。</li>
<li><b>穩定股</b>：生意成熟、大家每天要用（電信、水電）。成長慢但股利穩。看股利和殖利率。</li>
<li><b>景氣循環股</b>：獲利跟著景氣大起大落（航運、鋼鐵、塑化、記憶體）。看景氣方向，不要只看本益比。</li>
</ul>
<p class="term-note"><b>景氣循環股</b>＝賺多少很看景氣的公司，像冰店，夏天大賺、冬天冷清。</p>
<p>景氣循環股最大的陷阱：EPS 最高、本益比看起來最低的時候，常常是景氣的最高點。</p>`,
      example: {
        name: '三種性格各一家',
        body: `
<div class="table-wrap"><table>
<thead><tr><th>公司</th><th>性格</th><th>數字</th></tr></thead>
<tbody>
<tr><td>台積電 2330</td><td>成長</td><td>2025 營收年增 31.6%、EPS 66.25 元</td></tr>
<tr><td>中華電 2412</td><td>穩定</td><td>2025 營收年增 2.7%、EPS 4.99 元（8 年新高）</td></tr>
<tr><td>長榮 2603</td><td>景氣循環</td><td>EPS：2021 年 45.57、2022 年 87.07、2023 年 16.7、2024 年 64.87、2025 年 31.68 元</td></tr>
</tbody></table></div>
<p>長榮 2025 年配 16 元，用 2026/3/13 收盤價 207.5 元算殖利率約 7.7%，看起來很高。但它的獲利像雲霄飛車，2025 年稅後純益就比 2024 年少了約五成。（2022 年長榮有減資，那一年的 EPS 計算基礎不同，看大方向就好。）</p>`,
        sources: [S.tsmcY25Ctee, S.tsmcY25, S.cht25, S.evr2122, S.evr23, S.evr24, S.evr25, S.evr25Yield]
      },
      practice: `
<ol>
<li>把你觀察清單上的每一檔，標上「成長／穩定／循環」。</li>
<li>每一檔寫一個你之後要追的關鍵數字：成長股追營收年增率，穩定股追股利，循環股追產品價格或運價新聞。</li>
<li>如果一檔股票你分不出是哪一種，代表你還不夠懂它，先不要買。</li>
</ol>`,
      question: '某航運股去年 EPS 很高，本益比只有 3 倍。你會擔心什麼？',
      answer: `<p>擔心這是景氣高點。如果明年運價下來、EPS 大減，用明年的 EPS 算，本益比就不便宜了。循環股要看景氣接下來往哪走。</p>`,
      points: [
        '先分清楚成長、穩定、景氣循環。',
        '不同性格看不同數字。',
        '循環股本益比最低時，可能正是高點。'
      ]
    },

    {
      day: 14, week: 2, review: true,
      title: '實戰日：用檢查表分析一家公司',
      goal: '把這週學的串成一張檢查表，完整分析一家你有興趣的公司，寫出五行結論。',
      explain: `
<p>這是你之後每次想買一檔股票前，都要跑一遍的檢查表：</p>
<ol>
<li><b>它做什麼？</b>一句話說得出靠什麼賺錢嗎？屬於成長、穩定還是循環？</li>
<li><b>生意變好還是變差？</b>月營收年增率的方向。</li>
<li><b>好不好賺？</b>三率的方向，跟同業比。</li>
<li><b>賺的是真錢嗎？</b>營業現金流、自由現金流、負債比。</li>
<li><b>貴不貴？</b>近四季本益比，跟同業和自己過去比；殖利率和股利穩定度。</li>
</ol>
<p>五題都答得出來，你才算「懂」這家公司。答不出來的那一題，就是你還要做的功課。</p>`,
      example: {
        name: '台積電：五行結論範例', code: '2330',
        body: `
<ol>
<li>幫全世界做晶片，屬於成長股。</li>
<li>2026 年 9 月營收年增 54.7%，前 9 月年增 41.1%，生意很好。</li>
<li>第三季毛利率 66.4%、營益率 58.7%，非常會賺。</li>
<li>2025 年營運現金流約 2.3 兆、自由現金流約 1 兆，賺的是真錢。</li>
<li>近四季本益比約 24 倍（10/22 股價），一季配 7 元，殖利率不是重點。</li>
</ol>
<p>注意：分析完「這是好公司」，不等於「現在就該買」。價格和你的資金配置，是第 3、4 週的事。</p>`,
        sources: [S.tsmcSep, S.tsmcQ3, S.tsmcCash25, S.tsmcDiv, S.close1022]
      },
      practice: `
<ol>
<li>挑一家你有興趣、但還沒分析過的公司。</li>
<li>照五題檢查表，每題查資料、寫一行結論。</li>
<li>把五行結論貼到${TOOLS}「我的交易紀錄」的備註，或你自己的筆記。</li>
<li>如果你已經持有第 7 天買的那檔，也用這張表檢查一次。</li>
</ol>`,
      question: '一家公司五題裡有四題很好，但「賺的是真錢嗎」不過關。你會怎麼做？',
      answer: `<p>先不買，去查現金流為什麼不好。如果是正在蓋新廠、短期支出大，可以繼續觀察；如果是客戶一直不付錢、庫存堆積，就是要避開的公司。</p>`,
      points: [
        '每次買之前，先跑一遍五題檢查表。',
        '答不出來的那一題，就是還要做的功課。',
        '好公司不等於現在該買，還要看價格和資金配置。'
      ]
    },

    // ===================== 第 3 週：看懂價格：K 線、均線和指標 =====================

    {
      day: 15, week: 3,
      title: 'K 線和週期：日 K、週 K、月 K',
      goal: '看到 K 線圖，能說出一根代表多長的時間、那段時間怎麼開怎麼收；切換日 K、週 K 時知道自己在看什麼。',
      explain: `
<p class="term-note"><b>K 線</b>＝把一段時間的開盤、最高、最低、收盤畫成一根像蠟燭的圖。中間粗的叫<b>實體</b>，上下細線叫<b>影線</b>。</p>
<ul>
<li><b>收比開高</b>：台股畫成紅 K。</li>
<li><b>收比開低</b>：台股畫成綠 K（有些 App 是黑 K）。</li>
<li><b>上影線</b>長：盤中衝高，但被賣下來。</li>
<li><b>下影線</b>長：盤中跌深，但被買回來。</li>
</ul>
<p>一根 K 線代表多長的時間，看你選哪個<b>週期</b>：</p>
<ul>
<li><b>分時</b>：今天每一分鐘的成交價連成一條線，不是 K 線。</li>
<li><b>日 K</b> 一根是一天，<b>週 K</b> 一根是一週，<b>月 K</b> 一根是一個月。</li>
</ul>
<p>週期越長，雜訊越少。長期投資看週 K、月 K 就夠了；日 K 用來看最近的細節。</p>
<p>看美股要注意顏色：美國習慣<b>綠漲紅跌</b>，跟台股相反。富途牛牛可以在設定裡改成你習慣的顏色，先改好，才不會看反。</p>
<p>K 線只告訴你「發生了什麼」，不保證下一根會怎樣。</p>`,
      example: {
        name: '台積電的兩根代表性日 K', code: '2330',
        body: `
<ul>
<li><b>2026/10/22</b>：收 2,385 元，而且就是當天<b>最低價</b>。收在最低，K 線底下沒有下影線，代表賣壓到收盤都沒停。</li>
<li><b>2026/7/31</b>：以漲停 2,425 元收盤，漲 220 元。收在漲停、買盤到最後都很強，是一根長紅 K。</li>
</ul>
<p>同一家公司，兩根 K 線的「心情」完全相反。但如果你看的是週 K，這兩天只是兩根週 K 裡的一小段。</p>`,
        sources: [S.close1022, S.up0731]
      },
      practice: `
<ol>
<li>打開你持有那檔的 K 線畫面，切到日 K。找出最近 10 天最長的一根紅 K、最長的一根綠 K，各是哪天？那天有什麼新聞？</li>
<li>切到週 K，再切到月 K。同一檔股票，最近一年看起來是往上、往下，還是橫著走？</li>
<li>如果你用富途牛牛看美股，先到設定確認漲跌顏色，再看一檔你關注的美股週 K。</li>
<li>到<a href="guide.html#lab">看盤指南的指標實驗室</a>，切換日 K 和週 K，看同一段走勢在兩種週期下長什麼樣子。</li>
</ol>`,
      practiceSources: [S.futuColor],
      question: '一根 K 線開盤 100 元、最高 110 元、最低 99 元、收盤 101 元。這根 K 線長什麼樣子？代表什麼？',
      answer: `<p>小小的紅 K（收比開高 1 元），加上一條很長的上影線（衝到 110 又被賣回來）。代表盤中有人追高，但上面賣壓很重，最後幾乎回到原點。</p>`,
      points: [
        'K 線畫出開、高、低、收；一根代表多長，看你選的週期。',
        '長期投資看週 K、月 K，日 K 看細節。',
        '看美股先確認顏色：台股紅漲，美國習慣綠漲。'
      ]
    },

    {
      day: 16, week: 3,
      title: '均線：MA5、MA20、MA60 和趨勢',
      goal: '看懂 K 線圖上那幾條彎彎的線，以及新聞說的「跌破季線」是什麼意思。',
      explain: `
<p class="term-note"><b>均線</b>（MA）＝過去一段時間收盤價的平均，每天算一次、連成一條線。像看一個人最近 20 天的平均體重，比看單一天更準。</p>
<p>看盤 App 上寫的 <b>MA5、MA10、MA20、MA60</b>，數字是「幾期」的平均。台股常用的叫法：</p>
<ul>
<li><b>週線</b>：MA5，5 日均線（一週的交易日）。</li>
<li><b>月線</b>：MA20，20 日均線（約一個月）。</li>
<li><b>季線</b>：MA60，60 日均線（約一季）。</li>
</ul>
<p>注意「期」跟著週期走：日 K 上的 MA5 是 5 天；切到週 K，MA5 就變成<b>最近 5 週</b>的平均。像富途牛牛週 K 上常看到的 MA5、MA10、MA20、MA30，就是 5、10、20、30 週的平均。</p>
<p>股價在均線之上，代表這段時間買的人平均是賺的；在均線之下，平均是賠的。所以均線常被當成「支撐」或「壓力」。短均線在長均線上方、而且往上彎，叫<b>多頭排列</b>；反過來叫<b>空頭排列</b>。</p>
<p>均線是落後的：它是過去的平均，轉彎的時候常常已經漲或跌了一段。</p>`,
      example: {
        name: '台積電 2026 年 10 月的季線保衛戰', code: '2330',
        body: `
<ul>
<li>2026/10/18 的報導：台積電 10/16 收 2,420 元，正好在季線約 2,420 元附近，被稱為「季線保衛戰」。</li>
<li>同一篇報導說，外資近六個交易日累計賣超超過 11 萬張。</li>
<li>到了 10/22，台積電收 2,385 元，比那時候的季線位置還低。</li>
</ul>
<p>「跌破季線」的意思就是：最近一季買進的人，平均已經在賠錢。有些人會因此停損賣出，所以新聞特別在意這條線。</p>`,
        sources: [S.ma1018, S.close1022]
      },
      practice: `
<ol>
<li>在 K 線畫面打開均線，記下你持有那檔今天收在 MA20、MA60 的上面還是下面。</li>
<li>切到週 K，看 MA20（20 週，大約五個月）是往上彎還是往下彎。</li>
<li>在<a href="guide.html#lab">指標實驗室</a>按「跌破 MA20」，看那一根前後的 K 線和均線怎麼走。</li>
<li>每週五記錄一次，連續三週，看看自己能不能說出「趨勢」。</li>
</ol>`,
      practiceSources: [S.futuMa],
      question: '一檔股票的股價在季線上面，但季線一直往下彎。這代表什麼？',
      answer: `<p>短期股價反彈到季線上面，但一季來的大方向還是往下。可能是下跌趨勢裡的反彈，不一定是轉強。要等季線也開始走平、往上彎，趨勢才比較明確。</p>`,
      points: [
        'MA 是一段時間收盤價的平均；日 K 上 MA20 是 20 天，週 K 上是 20 週。',
        '股價在均線上，這段時間買的人平均是賺的。',
        '均線會落後，轉彎時常已經走了一段。'
      ]
    },

    {
      day: 17, week: 3,
      title: '成交量和法人：人氣和大錢',
      goal: '把價格、成交量和三大法人放在一起看，分辨「有人氣的漲」和「沒人跟的漲」。',
      explain: `
<p>成交量是人氣。同樣漲 3%，有沒有很多人一起買，意思完全不同：</p>
<ul>
<li><b>價漲量增</b>：漲的時候很多人搶買，比較有力。</li>
<li><b>價漲量縮</b>：漲，但跟的人變少，力道可能在減弱。</li>
<li><b>價跌量增</b>：很多人搶著賣，賣壓重。</li>
<li><b>價跌量縮</b>：跌，但賣的人也變少。</li>
</ul>
<p class="term-note"><b>成交值</b>＝成交的總金額（股數 × 價格），富途牛牛叫<b>成交額</b>。像夜市一整晚的總營業額。<br><b>三大法人</b>＝外資、投信、自營商三種機構投資人。<b>買超／賣超</b>＝當天買的比賣的多／少。</p>
<p>法人裡最要看的是<b>外資</b>：資金最大，常常決定權值股和大盤的方向。看法人要看<b>連續好幾天</b>的方向；單一天的大買大賣，常常隔天就反過來，不要拿來跟單。</p>
<p>成交量很小的股票，一點點買賣就能讓價格大動，你想賣時可能賣不掉，新手先避開。</p>`,
      example: {
        name: '2026/7/31 大漲，和外資手上的台積電',
        body: `
<ul>
<li>7/31 加權指數大漲 3,186.45 點（+7.98%），成交值超過 8 千億元，221 檔漲停。</li>
<li>那天三大法人合計買超 846.76 億元，外資買超台積電約 1.37 萬張。</li>
<li>截至 2026/9/15，外資持有台積電約 69.21%。到了 10 月中，報導說外資近六個交易日累計賣超台積電超過 11 萬張，股價同時落到季線附近。</li>
</ul>
<p>價漲、量大、法人大買，是典型「有人氣的漲」。而外資手上有將近七成的台積電，外資一轉向，台積電和大盤都會跟著動。</p>`,
        sources: [S.rally0731, S.inst0731, S.up0731, S.foreign, S.ma1018]
      },
      practice: `
<ol>
<li>打開 K 線畫面下方的成交量，找出最近 20 天量最大的一天，那天是漲還是跌？</li>
<li>看最近 5 天的價格和成交量，套上面四種情況，寫下是哪一種。</li>
<li>收盤後到證交所網站的「三大法人買賣超」，或 App 的「法人」頁，連續一週記下外資、投信對你持股的買賣超張數。</li>
<li>週末看一下：法人的方向和股價的方向一致嗎？</li>
</ol>`,
      question: '一檔股票連三天上漲，但成交量一天比一天少，外資也連三天賣超。你怎麼解讀？',
      answer: `<p>價漲量縮，追的人越來越少，大錢還在賣。上漲的力道可能不強，不是追高的好時機。可以等成交量重新放大、或外資停止賣超再看。</p>`,
      points: [
        '成交量是人氣：價漲量增較有力，價漲量縮要小心。',
        '三大法人看連續的方向，不看單一天，也不跟單。',
        '成交量太小的股票，新手先不要碰。'
      ]
    },

    {
      day: 18, week: 3,
      title: '技術指標：MACD、KD、RSI、布林通道',
      goal: '看得懂看盤 App 副圖上最常見的四個指標在說什麼，也知道它們什麼時候會騙人。',
      explain: `
<p>這四個指標都是用<b>過去的價格</b>算出來的，像體溫計：告訴你現在熱不熱，不會告訴你明天會不會發燒。</p>
<ul>
<li><b>MACD（看趨勢的力道）</b>：快線 <b>DIF</b> 是短天期和長天期平均的差，慢線是 DIF 再平均一次（富途叫 DEA 或 MACD）。DIF 往上穿過慢線叫<b>黃金交叉</b>，往下穿叫<b>死亡交叉</b>；柱子變長，代表目前的方向在加速。</li>
<li><b>KD（看位置）</b>：今天收盤落在最近 9 天高低區間的哪裡。80 以上是一直收在高點附近，偏熱；20 以下偏冷。</li>
<li><b>RSI（看漲的力道占多少）</b>：最近一段時間，漲的幅度占漲跌總幅度的比例。14 日 RSI 常用 70 以上叫<b>超買</b>、30 以下叫<b>超賣</b>；富途用 6、12、24 日三條線，說明以 80、20 為界。</li>
<li><b>布林通道（看波動）</b>：中間是 20 日均線，上下各加減 2 個標準差，大約九成的價格會落在通道裡。碰到上軌是漲得急，碰到下軌是跌得急；通道變窄，代表波動變小、在等方向。</li>
</ul>
<p class="term-note"><b>標準差</b>＝價格平常離平均有多遠的一把尺。<br><b>鈍化</b>＝指標一直停在 80 以上（或 20 以下）不下來。強勢股常這樣，所以「KD 太高就賣」常常賣太早。</p>
<p>使用順序：先用基本面決定「值不值得買」，再用均線看大方向，最後才用指標看「現在是不是太熱、太冷」。長期投資的人，看週 K 上的指標就夠了。</p>`,
      example: {
        name: '2025 年 4 月：指標「超賣」之後',
        body: `
<ul>
<li>2025/4/7，加權指數一天跌 2,065.87 點，收 19,232.35 點。</li>
<li>4/9 再跌 1,068.19 點，收 17,391.76 點，是 2025 年最低的收盤。三天一共跌了 3,906.46 點。</li>
<li>2025 年全年，加權指數還是漲了 25.74%，收 28,963.60 點。</li>
</ul>
<p>連續大跌、每天都收在最近的低點，KD 和 RSI 會掉到很低的「超賣」區。但超賣不是「馬上會漲」：4/7 一看到超賣就買的人，兩天後還要再跌一千多點。指標告訴你「跌得很急」，不告訴你「跌完了沒」。</p>`,
        sources: [S.crash0407, S.tw0409, S.tw2025]
      },
      practice: `
<ol>
<li>打開<a href="guide.html#lab">指標實驗室</a>，按「RSI 最熱」「MACD 黃金交叉」「KD 死亡交叉」，讀完每一根的白話判讀。</li>
<li>按「換一組走勢」，自己先猜這一根的 KD、RSI 是熱還是冷，再看判讀對不對。</li>
<li>打開你持有那檔的日 K 和週 K，在副圖切換 MACD、KD、RSI，記下現在各是多少、偏熱還是偏冷。</li>
<li>在交易紀錄的備註寫一句：「我只把指標當……用。」</li>
</ol>`,
      practiceSources: [S.pocketKD, S.pocketInd, S.futuRsi, S.futuMacd, S.boll, S.bollPct],
      question: '一檔股票的 KD 已經連續五天在 85 以上，朋友說「太熱了，快賣」。你怎麼想？',
      answer: `<p>KD 長時間停在高檔叫高檔鈍化，強勢股常這樣，光看 KD 高就賣，可能賣在半山腰。要回頭看當初買的理由還在不在、有沒有碰到你寫好的出場條件，再搭配均線和成交量判斷。</p>`,
      points: [
        'MACD 看趨勢力道，KD 看位置，RSI 看漲的力道，布林看波動。',
        '指標是體溫計，只描述過去，不預言下一根。',
        '先看基本面和均線，指標最後才用；鈍化時別只看數字買賣。'
      ]
    },

    {
      day: 19, week: 3,
      title: '新聞、法說會和目標價：看預期差',
      goal: '看懂為什麼好消息也會跌，也知道看盤 App 上的「分析師評級」和「目標價」該怎麼看。',
      explain: `
<p>股價反映的是大家對未來的猜測。所以新聞出來時，重點是「比大家想的好還是壞」：</p>
<ul>
<li>比預期好：往往漲。</li>
<li>比預期差：往往跌，就算消息本身還不錯。</li>
<li>跟預期差不多：可能不動，甚至<b>利多出盡</b>：好消息大家早就知道，公布那天反而有人趁機賣。</li>
</ul>
<p class="term-note"><b>法說會</b>＝公司向投資人報告成績和展望的說明會，最重要的常常是「展望」。<br><b>目標價</b>＝券商分析師估計這檔股票未來大約一年的合理價格。<b>評級</b>是他給的建議，例如買進、持有、賣出。</p>
<p>富途牛牛的「分析師評級」頁，會把很多家券商的評級和目標價整理成最高、平均、最低。怎麼看：</p>
<ul>
<li>目標價是預測，不是保證。最高和最低常常差很多，代表連專家都看法分歧。</li>
<li>目標價會跟著新消息調整。例如台積電法說會前後，好幾家券商都調高了目標價。</li>
<li>拿來了解「市場在期待什麼」，也就是預期在哪裡；不要拿來當買進的理由。</li>
</ul>`,
      example: {
        name: '台積電 2026 年的三次法說會', code: '2330',
        body: `
<ul>
<li><b>4/16 第一季法說</b>：EPS 22.08 元、毛利率 66.2% 都創新高，隔天股價反而下跌，尾盤收在 2,030 元，報導說內容大多「符合預期」。</li>
<li><b>7/16 第二季法說</b>：隔天台積電跌 180 元（−7.29%），報導整理的原因包括市場對第三季毛利率展望失望。</li>
<li><b>10/15 第三季法說</b>：EPS 29.43 元創新高，但 10/16 股價跌 20 元、收 2,420 元。同一天整理的內外資目標價，從法巴的 3,090 元到 Aletheia 的 5,000 元都有。</li>
</ul>
<p>三次成績都很好，股價卻都跌，決定股價的是跟預期的差距。而 5,000 元比 3,090 元高了六成，也說明目標價只是「一種看法」。</p>`,
        sources: [S.tsmcQ1, S.tsmcQ1Price, S.crash0717, S.crash0717Setn, S.tsmcQ3, S.tsmcTarget]
      },
      practice: `
<ol>
<li>查你持有或觀察的公司，下一次法說會是哪一天（公司官網或公開資訊觀測站的法說會公告）。</li>
<li>法說會前，用新聞標題寫下市場在期待什麼；法說會後，對照實際的展望和隔天的股價，判斷是「比預期好」還是「比預期差」。</li>
<li>在富途牛牛打開一檔美股的「分析師評級」頁，記下最高、平均、最低目標價和現在的股價。最高比最低多了幾 %？</li>
</ol>`,
      question: '某公司公布「今年獲利成長 30%」，股價當天大跌。可能的原因？',
      answer: `<p>可能大家原本期待 50%；或好消息早就漲進股價、有人獲利了結；或公司給的明年展望保守；也可能那天整個市場都在跌。新聞要跟預期、展望、大盤一起看。</p>`,
      points: [
        '股價看的是跟預期的落差，法說會最重要的是展望。',
        '目標價是預測，會一直調整，最高和最低常差很多。',
        '用評級了解市場期待，不拿來當買進理由。'
      ]
    },

    {
      day: 20, week: 3,
      title: '國際連動和美股看盤：時差、盤前盤後、夜盤',
      goal: '知道每天開盤前要先看哪幾個國外數字，也搞懂美股在台灣時間幾點交易。',
      explain: `
<p>台股開盤前，美國股市剛收盤。美股的表現，常常直接影響台股當天的開盤：</p>
<ul>
<li><b>費城半導體指數（費半）</b>：美國半導體股的指數。台股電子股比重很高，跟費半特別連動。</li>
<li><b>那斯達克</b>：美國科技股為主的指數。</li>
<li><b>台積電 ADR</b>：台積電在美國掛牌的股票憑證，像台積電在美國開的分店。</li>
</ul>
<p>美股正常交易是美東時間 9:30～16:00。換成台灣時間，要看美國是不是在<b>夏令時間</b>（把時鐘撥快一小時）：</p>
<div class="table-wrap"><table>
<thead><tr><th>時段（台灣時間）</th><th>夏令（到 10/31）</th><th>冬令（2026/11/1 起）</th></tr></thead>
<tbody>
<tr><td>盤前</td><td>16:00～21:30</td><td>17:00～22:30</td></tr>
<tr><td>正常交易</td><td>21:30～隔天 04:00</td><td>22:30～隔天 05:00</td></tr>
<tr><td>盤後</td><td>04:00～08:00</td><td>05:00～09:00</td></tr>
</tbody></table></div>
<p class="term-note"><b>盤前、盤後</b>＝正常交易以外也能買賣的時段，各券商開放的時間可能更短。<br><b>夜盤</b>＝富途等券商提供的美國夜間時段（美東 20:00～隔天 04:00），只有部分股票、只能用限價單。</p>
<p>這些時段人少，價格跳得大。新手原則：盤前、盤後、夜盤的價格只當參考；真的要下單，在正常交易時間、用限價。</p>`,
      example: {
        name: '2026/7/16 費半 → 7/17 台股',
        body: `
<ul>
<li>美國時間 2026/7/16，費城半導體指數收 11,867.5 點，單日跌 4.29%。</li>
<li>隔天台灣時間 7/17，台股跌 2,953.71 點（−6.47%），台積電跌 7.29%。</li>
</ul>
<p>這不是巧合。報導整理那天台股大跌的原因，美國科技股大跌就是其中之一。開盤前先看費半，你就不會被開盤嚇到。</p>`,
        sources: [S.sox0716, S.crash0717, S.crash0717Setn]
      },
      practice: `
<ol>
<li>連續五個交易日，開盤前查費半、那斯達克、台積電 ADR 的漲跌幅，記下台股當天開盤和收盤的漲跌。</li>
<li>一週後看看：美股和台股開盤方向一致的有幾天？收盤呢？</li>
<li>在富途牛牛打開一檔美股，找出畫面上的盤前、盤後或夜盤價格，跟正常交易的收盤價差多少？</li>
<li>記住：11 月 1 日起，美股開盤變成台灣時間晚上 10:30。</li>
</ol>`,
      practiceSources: [S.usHours, S.usExt, S.dst2026, S.futuNight],
      question: '昨晚費半大漲 3%，今天台股開盤也大漲，但收盤變成小跌。可能發生了什麼？',
      answer: `<p>開盤反映了美股的好消息，但盤中可能有人趁高賣出、獲利了結，或台灣本身有利空消息。國外連動最影響開盤，收盤還是看當天的買賣力道。</p>`,
      points: [
        '開盤前先看費半、那斯達克、台積電 ADR。',
        '美股開盤：夏令台灣 21:30，冬令 22:30。',
        '盤前、盤後、夜盤人少價格跳，只當參考，下單用限價。'
      ]
    },

    {
      day: 21, week: 3, review: true,
      title: '實戰日：用看盤 App 追蹤一檔股票一週',
      goal: '把 K 線、均線、成交量、法人、指標、新聞、國際連動放進同一張每日紀錄表。',
      explain: `
<p>這週學的都是「看價格」的工具。單獨看一個容易看錯，放在一起才有意義。每天收盤後花 5 分鐘，填這張表：</p>
<div class="table-wrap"><table>
<thead><tr><th>項目</th><th>記什麼</th></tr></thead>
<tbody>
<tr><td>K 線</td><td>紅 K／綠 K、有沒有長影線</td></tr>
<tr><td>均線</td><td>收盤在 MA20、MA60 的上面或下面</td></tr>
<tr><td>成交量</td><td>比前 5 天平均多或少</td></tr>
<tr><td>法人</td><td>外資、投信買超或賣超多少張</td></tr>
<tr><td>指標</td><td>KD、RSI 偏熱、偏冷或中間；MACD 有沒有交叉</td></tr>
<tr><td>新聞</td><td>有沒有營收、法說、目標價調整</td></tr>
<tr><td>國際</td><td>前一晚費半漲跌幅</td></tr>
</tbody></table></div>
<p>每天看日 K；週末再切到週 K 看一次，確認大方向有沒有變。</p>`,
      example: {
        name: '台積電：一週紀錄範例（2026 年 10 月中旬）', code: '2330',
        body: `
<ul>
<li>10/15 法說會公布第三季 EPS 29.43 元、毛利率 66.4%。</li>
<li>10/16 收 2,420 元，位在季線附近；外資近六個交易日累計賣超超過 11 萬張。內外資目標價從 3,090 元到 5,000 元。</li>
<li>10/21 收 2,420 元，漲 15 元。</li>
<li>10/22 收 2,385 元，跌 35 元、收在最低，跌到季線位置下方；大盤跌 1.81%。</li>
<li>10/23 颱風休市、10/26 光復節補假，台股 10/27 才開盤。遇到休市，紀錄就跳過。</li>
</ul>
<p>拼起來看：成績很好、分析師看多，但外資在賣、股價跌到季線下。這就是「基本面好、短線價格偏弱」的狀態，很適合寫進紀錄、繼續觀察。</p>`,
        sources: [S.tsmcQ3, S.ma1018, S.tsmcTarget, S.close1021, S.close1022, S.taiex1022, S.closed1023]
      },
      practice: `
<ol>
<li>選一檔你持有或最想買的股票。</li>
<li>接下來 5 個交易日，每天收盤後填上面那張表（寫在筆記或${TOOLS}的交易紀錄備註）。</li>
<li>第 5 天寫一段話：這一週它的價格、人氣、法人、指標、新聞分別在說什麼？跟你第 14 天的基本面結論一致嗎？</li>
</ol>`,
      question: '一檔股票基本面檢查都過關，但跌破季線、外資連續賣超、KD 在 20 以下。你會怎麼做？',
      answer: `<p>沒有標準答案，但可以先不急著一次買滿。好公司也可能有一段價格偏弱的時間，KD 低也不代表跌完了。可以分批、或等股價重新站回均線、法人停止賣超再加碼，同時繼續追營收。</p>`,
      points: [
        '價格工具要放在一起看，單看一個容易錯。',
        '每天 5 分鐘填紀錄表，週末看一次週 K。',
        '基本面看「值不值得買」，價格看「什麼時候買」。'
      ]
    },

    // ===================== 第 4 週：長期投資：策略和市場 sense =====================

    {
      day: 22, week: 4,
      title: '市場的脾氣：長期向上，中間常常大跌',
      goal: '建立對市場的基本感覺：跌 10%、20% 是常態，最好和最壞的日子常常黏在一起。',
      explain: `
<p>看盤看久了，最需要的不是更多指標，而是知道「市場正常長什麼樣子」。三件事先記住：</p>
<ol>
<li><b>每年都會跌一段</b>：就算全年上漲的年份，中間也常常先跌 10% 以上。</li>
<li><b>大跌和大漲常常黏在一起</b>：最好的幾天，常常就出現在最差的幾天附近。嚇得賣掉的人，往往也錯過反彈。</li>
<li><b>短期看情緒，長期看賺錢</b>：短期股價像人氣投票，大家怕就跌、大家搶就漲；長期像體重計，量的是公司實際賺了多少。</li>
</ol>
<p class="term-note"><b>回檔</b>＝從高點跌下來一段。市場上習慣把跌 10% 左右叫<b>修正</b>，跌 20% 以上叫<b>空頭</b>（熊市）；長期上漲叫<b>多頭</b>（牛市）。</p>
<p>所以真正的風險控管，不是猜哪天會跌，而是放進股市的錢，要是「跌 20%～30% 你也抱得住」的錢。</p>`,
      example: {
        name: '台股和美股的大跌與回升',
        body: `
<ul>
<li><b>2022 年</b>：加權指數從 1/5 盤中的 18,619.61 點，跌到 10/25 盤中的 12,629.48 點，大約跌了三成；全年跌 22.4%。</li>
<li><b>接下來三年</b>：2023 年漲 26.83%、2024 年漲 28.47%、2025 年漲 25.74%。</li>
<li><b>2025/4/9</b>：收 17,391.76 點，是 2025 年最低的收盤；到 2026/10/22，加權指數收 46,041.43 點。</li>
<li><b>美股</b>：1980～2025 年，標普 500 每年年內的最大跌幅平均 14.2%，但 46 年裡有 35 年全年是漲的。</li>
<li><b>錯過最好的日子</b>：2005～2024 年，一萬美元一直放在標普 500 會變成 71,750 美元；錯過最好的 10 天，只剩 32,871 美元。最好的 10 天裡有 7 天，就在最差的 10 天前後兩週內。</li>
</ul>
<p>過去不保證未來，但這些數字說明：大跌是市場的日常，能不能留在場上，比猜對哪天跌更重要。</p>`,
        sources: [S.tw2022, S.tw2023, S.tw2024, S.tw2025, S.tw0409, S.taiex1022, S.jpmIntra, S.jpmBest]
      },
      practice: `
<ol>
<li>打開加權指數的月 K，找出 2022 年那段下跌：花了多久跌下來？又花了多久漲回 2022 年初的高點？</li>
<li>用你現在放在股市的金額算：跌 20% 是多少錢？寫下來。</li>
<li>問自己：如果明天就少了這筆錢，我會睡不著、想全部賣掉嗎？如果會，代表股票放太多，第 25 課會教怎麼調。</li>
<li>寫一句話給未來大跌時的自己，例如「跌 20% 是常態，我照計畫來」。</li>
</ol>`,
      question: '大盤已經從高點跌了 15%，新聞都在說要崩盤了。照過去的經驗，你怎麼看？',
      answer: `<p>跌 15% 在股市並不罕見，美股過去平均每年年內就會跌 14% 左右。這不代表一定很快漲回來，但如果你買的是整個市場、放的是長期不用的錢，恐慌賣出常常是最差的選擇。比較該做的，是檢查自己的配置是不是放太多在股票。</p>`,
      points: [
        '每年中間跌一段是常態；跌 20% 以上叫空頭。',
        '最好和最壞的日子常黏在一起，嚇跑就會錯過反彈。',
        '放進股市的，要是跌 30% 也抱得住的錢。'
      ]
    },

    {
      day: 23, week: 4,
      title: '指數化投資：為什麼大多數人打不贏大盤',
      goal: '知道為什麼「買整個市場」適合當長期投資的核心，以及挑大盤 ETF 要看什麼。',
      explain: `
<p class="term-note"><b>指數化投資</b>＝不挑個股，直接用 ETF 買下整個市場，拿市場的平均報酬。像不猜哪個攤位最好吃，直接買下整條夜市的股份。</p>
<p>聽起來很普通，但「平均」其實很難打敗，原因有兩個：</p>
<ul>
<li><b>專家也很難一直選對</b>：美國的統計顯示，大部分專業基金經理人的績效落後大盤。</li>
<li><b>費用會複利</b>：費用每年從資產裡扣，看起來很小，幾十年累積起來差很多。</li>
</ul>
<p>台股最常見的兩種 ETF：</p>
<ul>
<li><b>市值型</b>（例如 0050、006208）：買市值最大的公司，跟著大盤走，台積電比重很重。</li>
<li><b>高股息型</b>（例如 0056）：挑預估殖利率高的公司，配息次數多。但配息會從股價扣掉（除息），配得多不等於賺得多。</li>
</ul>
<p>想分散到台灣以外，可以透過券商的<b>複委託</b>（請台灣券商幫你下美股的單）買美國 ETF，例如追蹤標普 500 的 VOO、買全世界股票的 VT。要知道：美國股票和 ETF 配給台灣人的股利，原則上會先被美國扣 30% 的稅。</p>
<p>挑大盤 ETF 看三件事：<b>追蹤什麼指數、一年費用多少、規模和成交量夠不夠大</b>。</p>`,
      example: {
        name: '0050、VOO、VT 的數字',
        body: `
<div class="table-wrap"><table>
<thead><tr><th></th><th>0050</th><th>VOO</th><th>VT</th></tr></thead>
<tbody>
<tr><td>買什麼</td><td>台灣市值前 50 大</td><td>美國標普 500</td><td>全世界的股票</td></tr>
<tr><td>一年費用</td><td>經理費依規模分級；規模約 2 兆元時約 0.0725%（另有保管費）</td><td>0.03%</td><td>0.06%</td></tr>
</tbody></table></div>
<ul>
<li>0050 從 2003 年成立到 2026 年 5 月底，含息報酬率 2208%，年化約 14.94%。但 2026 年 5 月時，台積電一家就占了約 60.39%。</li>
<li>美國的 SPIVA 報告：2025 年有 79% 的大型股主動基金落後標普 500；拉長到 5 年，有 89% 落後。</li>
</ul>
<p>過去的高報酬不保證未來。0050 高度集中在台積電，想分散，可以把一部分放到 VOO 或 VT 這類海外大盤 ETF。</p>`,
        sources: [S.etf0050, S.etf0050ret, S.w0050, S.fee0050, S.fee0050now, S.voo, S.vt, S.spiva, S.irs515]
      },
      practice: `
<ol>
<li>到元大投信官網，打開 0050 和 0056 的持股權重，抄下前 5 大持股和比重，比較兩檔的差別。</li>
<li>寫下你想要的核心：只買台股大盤（0050 或 006208）、加上美股（VOO），還是全世界（VT）？各占多少？</li>
<li>如果要買美國 ETF，問你的券商複委託的手續費和最低收費，寫下來。</li>
</ol>`,
      practiceSources: [S.etf0056],
      question: '同樣 100 萬元放 30 年，假設市場每年平均漲 7%。A 每年費用 0.1%，B 每年費用 1.5%。30 年後大約差多少？',
      answer: `<p>簡化成「報酬減掉費用」來算：A 每年 6.9%，30 年後約 740 萬元；B 每年 5.5%，約 498 萬元，差了大約 242 萬元。每年只差 1.4%，30 年後卻差了將近四分之一。（這是假設的數字，用來看費用的影響。）</p>`,
      points: [
        '指數化投資＝用 ETF 買整個市場，拿平均報酬。',
        '大部分專業基金長期落後大盤，費用會複利。',
        '挑大盤 ETF：看追蹤指數、費用、規模和成交量。'
      ]
    },

    {
      day: 24, week: 4,
      title: '定期定額 vs 單筆：兩種買法',
      goal: '知道兩種買法各自的優缺點，並把你的買法寫成一條規則。',
      explain: `
<p class="term-note"><b>定期定額</b>＝每個月固定日期、固定金額自動買。像每月自動轉帳存錢。<br><b>單筆</b>＝自己挑時間、一次買進一筆。</p>
<ul>
<li><b>單筆</b>：如果手上已經有一大筆錢，研究發現，一次投入大約三分之二的時間會贏過分批投入，因為市場上漲的時間比下跌多。缺點是很容易被情緒影響：越漲越想追、越跌越不敢買。</li>
<li><b>定期定額</b>：不用猜高低，價格低時自動多買。每個月領薪水就投入，本來就是分批，而且能幫你管住最大的敵人：情緒。缺點是行情一路往上時，平均成本會比一開始全買高。</li>
</ul>
<p>實戰上很多人兩種一起用：每月固定扣款買大盤 ETF 當核心；手上有閒錢時，照第 25 課的配置比例單筆補進去；再用一小部分資金，照自己的檢查表練習買個股。</p>`,
      example: {
        name: '大家都在定期定額什麼？',
        body: `
<div class="table-wrap"><table>
<thead><tr><th>代號</th><th>名稱</th><th class="num">2026 年 8 月定期定額人數</th></tr></thead>
<tbody>
<tr><td>0050</td><td>元大台灣50</td><td class="num">約 128 萬</td></tr>
<tr><td>0056</td><td>元大高股息</td><td class="num">約 33.8 萬</td></tr>
<tr><td>00878</td><td>國泰永續高股息</td><td class="num">約 31.3 萬</td></tr>
<tr><td>006208</td><td>富邦台50</td><td class="num">約 25.7 萬</td></tr>
</tbody></table></div>
<p>前幾名都是 ETF，其中市值型的 0050 遙遙領先。定期定額最常見的用法，就是長期存一籃子股票。</p>`,
        sources: [S.dca, S.vanguardLS]
      },
      practice: `
<ol>
<li>在券商 App 找到「定期定額」功能，看看最低扣款金額、可選的扣款日、手續費怎麼算。</li>
<li>決定你的買法，寫成一句規則，例如「每月 X 號扣 Y 元買 Z；有獎金時單筆補到目標比例」。</li>
<li>如果決定要開始，設定第一筆定期定額；如果還沒，先把規則寫好。</li>
</ol>`,
      question: '小美每月定期定額 3,000 元。三個月價格是 30、20、30 元。她平均成本是多少？',
      answer: `<p>3,000 ÷ 30 ＝ 100；3,000 ÷ 20 ＝ 150；3,000 ÷ 30 ＝ 100。共 350 單位、花 9,000 元，平均成本約 25.7 元，比三個月平均價 26.7 元低。價格低時自動多買，就是定期定額的優勢。（先不算手續費）</p>`,
      points: [
        '有一筆閒錢時，一次投入大約三分之二的時間贏過分批。',
        '定期定額適合每月有收入的人，也幫你管住情緒。',
        '把你的買法寫成一句規則。'
      ]
    },

    {
      day: 25, week: 4,
      title: '資產配置：核心＋衛星，和每年再平衡',
      goal: '決定你的錢怎麼分：緊急預備金、股票和現金各多少，大盤 ETF 和個股各多少。',
      explain: `
<p class="term-note"><b>資產配置</b>＝把錢分到不同的籃子，並決定每一籃多大。像便當盒的格子，白飯、主菜、配菜各放多少。</p>
<p>長期投資的配置，可以照這個順序排：</p>
<ol>
<li><b>緊急預備金</b>：先留 3～6 個月的生活費在銀行。失業、生病時不用被迫賣股票。</li>
<li><b>股票和現金（或債券）的比例</b>：看你承受得了多大的跌幅。股票占 70% 時，股市跌 30%，總資產大約少 21%。</li>
<li><b>核心＋衛星</b>：股票裡大部分（例如八成）放大盤 ETF 當核心；一小部分（例如兩成）當衛星，用來練習挑個股。衛星賠了，也傷不到核心。</li>
</ol>
<p class="term-note"><b>再平衡</b>＝定期把比例調回原本的設定。股票漲多了就賣一點、跌多了就買一點，等於自動「漲多賣、跌多買」。</p>
<p>再平衡的規則要簡單：每年固定一天檢查一次，或比例偏離超過 5 個百分點才調。</p>`,
      example: {
        name: '用 2025 年的台股算一次再平衡',
        body: `
<p>假設你在 2025 年初有 100 萬元，照「股票 70%、現金 30%」配置，股票部分跟著大盤漲跌。</p>
<ul>
<li>2025 年加權指數漲 25.74%。股票從 70 萬變成約 88.0 萬，現金還是 30 萬，總共約 118.0 萬。</li>
<li>這時股票占了約 74.6%，比目標多 4.6 個百分點。</li>
<li>調回 70%：股票應該是 118.0 萬 × 70% ≈ 82.6 萬，所以賣掉約 5.4 萬，放回現金。</li>
</ul>
<p>反過來，遇到 2022 年那種全年跌 22.4% 的年份，再平衡會叫你拿現金買股票，而且是在大家最害怕的時候。（加權指數的漲跌不含股利，這裡只是示範算法。）</p>`,
        sources: [S.tw2025, S.tw2022]
      },
      practice: `
<ol>
<li>算出你的緊急預備金：每月生活費 × 3～6，確認已經留好。</li>
<li>寫下你的目標配置，例如「股票 70%、現金 30%；股票裡核心 ETF 80%、衛星個股 20%」。</li>
<li>列出目前所有持股（包括 ETF）和現金，算實際比例，跟目標差多少？</li>
<li>在行事曆設定一天（例如每年 1 月第一個週末）做再平衡。</li>
</ol>`,
      question: '你的目標是股票 60%、現金 40%。一年後股市大跌，股票變成只占 50%。照再平衡規則該怎麼做？心裡會有什麼感覺？',
      answer: `<p>拿現金買股票，把股票調回 60%。心裡多半會害怕，因為大家都在賣。但這正是再平衡的用處：用事先寫好的規則，代替當下的情緒。前提是你買的是分散的大盤 ETF，不是單一個股。</p>`,
      points: [
        '先留緊急預備金，再決定股票和現金的比例。',
        '核心放大盤 ETF，衛星才練個股。',
        '每年再平衡一次，用規則代替情緒。'
      ]
    },

    {
      day: 26, week: 4,
      title: '利率、景氣和估值：看懂市場的大環境',
      goal: '知道利率、景氣燈號和本益比怎麼影響整個市場，看得懂新聞每天在吵什麼。',
      explain: `
<p class="term-note"><b>利率</b>＝借錢的價格。<b>升息</b>是中央銀行把利率調高，<b>降息</b>是調低。美國的中央銀行叫<b>聯準會（Fed）</b>，0.25 個百分點常叫「一碼」。</p>
<p>利率和股市的關係，可以這樣想：</p>
<ul>
<li>利率高，錢放銀行就有不錯的利息，大家比較不急著買股票；公司借錢的成本也變高。</li>
<li>股價是在買公司「未來的錢」。利率越高，未來的錢換算成今天就越不值錢，所以靠遠期成長、本益比高的股票通常跌最兇。</li>
<li>降息通常對股市有利；但如果是因為景氣變差才降息，股市不一定漲。</li>
</ul>
<p class="term-note"><b>景氣對策信號</b>（景氣燈號）＝國發會每月公布的景氣溫度計，由熱到冷是紅燈、黃紅燈、綠燈、黃藍燈、藍燈。<br><b>大盤本益比</b>＝整個市場的股價是一年獲利的幾倍。比過去平均高，代表大家比較樂觀、價格偏貴。</p>
<p>這些不能用來猜明天漲跌，但能幫你理解大環境，避免在大家最樂觀時把錢一次全部投入。</p>`,
      example: {
        name: '2022 年的升息，和 2026 年的現在',
        body: `
<ul>
<li><b>2022 年</b>：聯準會把利率從年初的 0～0.25%，一路升到年底的 4.25%～4.5%。那一年標普 500 跌 19.4%，科技股多的那斯達克跌 33.1%，台股加權指數跌 22.4%。</li>
<li><b>2026/9/16</b>：聯準會升息一碼，利率區間變成 3.75%～4%。</li>
<li><b>台灣</b>：央行 2026/6/18 維持重貼現率 2%；國發會公布 2026 年 8 月的景氣燈號是 41 分的紅燈，連續第 9 顆紅燈。</li>
<li><b>估值</b>：2026/10/23，標普 500 用未來 12 個月獲利算的本益比是 18.7 倍，10 年平均是 19.1 倍。</li>
</ul>
<p>2022 年說明了利率的力量：科技股跌得比整體市場多很多。現在美國利率又往上走、台灣景氣卻亮紅燈，這就是新聞每天在吵的事。</p>`,
        sources: [S.fed2022a, S.fed2022b, S.spx2022, S.tw2022, S.fed0916, S.cbc0618, S.lights08, S.factset1023]
      },
      practice: `
<ol>
<li>查聯準會最近一次利率決策是升息、降息還是不變，再看隔天台股和你持股的反應，寫下來。</li>
<li>每月月底查一次國發會的景氣燈號，記下顏色和分數。</li>
<li>在你的投資計畫加一條：「大家最樂觀、估值偏高時，照定期定額慢慢買，不一次全押。」</li>
</ol>`,
      question: '聯準會宣布降息，但當天美股大跌。可能的原因？',
      answer: `<p>可能降息早就在預期中（利多出盡），或降得比大家期待的少；也可能聯準會降息是因為看到景氣轉差，大家擔心公司獲利。跟第 19 課一樣，看的是跟預期的差距。</p>`,
      points: [
        '利率是錢的價格；升息對高本益比的成長股壓力最大。',
        '景氣燈號是景氣溫度計，本益比看市場貴不貴。',
        '大環境用來理解新聞，不用來猜明天漲跌。'
      ]
    },

    {
      day: 27, week: 4,
      title: '風險控管：停損、部位大小和槓桿',
      goal: '分清楚核心 ETF 和衛星個股的風險控管方式，寫好出場條件，也知道為什麼第一年不碰槓桿。',
      explain: `
<p>長期投資的核心 ETF，風險靠<b>配置</b>控制（第 25 課），不用停損；衛星個股才需要停損，因為單一公司可能一路跌下去不回來。</p>
<p class="term-note"><b>停損</b>＝跌到某個條件就認賠賣出，讓小傷不變重傷。像開車的油量警示燈。條件可以是價格（跌破買價某個 %）、理由（當初買的理由不見了）、或時間（很久都沒照預期走）。</p>
<p>個股買多少，先決定「這筆最多願意賠多少」，再反推：</p>
<p><b>最多可買股數 ＝ 這筆最多願意賠的錢 ÷（買進價 − 停損價）</b></p>
<p>例如練習資金 10 萬元，每筆最多賠 2%（2,000 元）。買 100 元、停損 90 元，每股最多賠 10 元，最多買 200 股。</p>
<p class="term-note"><b>融資</b>＝跟券商借錢買股票，上市股票一般最多借六成。<b>融券</b>＝借股票來賣。<b>當沖</b>＝同一天買進又賣出。</p>
<p>融資算一次：買 100 元的股票、借 60 元，維持率 100 ÷ 60 ≈ 166%。跌到 78 元時 78 ÷ 60 ＝ 130%，就會被追繳；沒補錢，券商會強制賣出（<b>斷頭</b>）。<b>只跌 22% 就可能被迫出場</b>，連等它漲回來的機會都沒有。</p>`,
      example: {
        name: '2026/7/17：一天跌 7% 的考驗', code: '2330',
        body: `
<ul>
<li>台積電一天跌 180 元（−7.29%），加權指數跌 6.47%，有 135 家跌停。</li>
<li>假設你前一天用 2,470 元買了 10 股台積電，一天就少了 1,800 元。事先寫好「跌破買價 8% 停損」的人，那天還沒碰到，可以照計畫觀察；沒寫的人很容易在恐慌中賣在低點。</li>
<li>用融資滿額買的人，這種日子維持率會一口氣往下掉。</li>
<li>後來台積電 7/31 漲停到 2,425 元、9/23 收 2,500 元。</li>
</ul>
<p>事先寫好的規則，讓你不被一天的情緒推著走；不借錢，讓你永遠有機會等。</p>`,
        sources: [S.crash0717, S.crash0717Tvbs, S.up0731, S.mcap0923, S.marginRule, S.margin]
      },
      practice: `
<ol>
<li>打開交易紀錄，替每一筆衛星個股補上停損和停利條件（價格或理由都可以）。</li>
<li>用${TOOLS}的「停損與部位大小」，算出你下一筆最多可以買幾股。</li>
<li>確認你的證券帳戶沒有開信用交易，並在原則裡寫上「第一年不融資、不融券、不當沖」。</li>
<li>每週檢查一次：有沒有哪一檔已經碰到條件、但你沒照做？為什麼？</li>
</ol>`,
      question: '你買的個股跌了 15%，碰到你寫的停損條件。但你覺得「它是好公司，應該會漲回來」。怎麼辦？',
      answer: `<p>先照規則執行，至少賣掉一部分。如果真的覺得理由還在，可以之後重新跑一次檢查表，用新的價格、新的部位大小再買回來。這比放著不管、讓虧損越來越大好。</p>`,
      points: [
        '核心 ETF 用配置控制風險，衛星個股才用停損。',
        '最多股數 ＝ 願意賠的錢 ÷（買價 − 停損價）。',
        '融資跌約 22% 就可能被斷頭，第一年不碰槓桿。'
      ]
    },

    {
      day: 28, week: 4, review: true,
      title: '實戰日：寫下你的長期投資計畫書',
      goal: '把第 4 週學的整理成一頁計畫書，並用它檢討這四週的交易紀錄。',
      explain: `
<p>計畫書是寫給「大跌時的自己」看的。一頁就好，六個欄位：</p>
<div class="table-wrap"><table>
<thead><tr><th>欄位</th><th>寫什麼</th></tr></thead>
<tbody>
<tr><td>目標</td><td>這筆錢要用在哪裡、幾年後才用</td></tr>
<tr><td>預備金</td><td>留幾個月的生活費、放在哪裡</td></tr>
<tr><td>配置</td><td>股票和現金的比例；核心 ETF 和衛星個股的比例</td></tr>
<tr><td>買法</td><td>每月幾號、定期定額多少、買哪一檔</td></tr>
<tr><td>再平衡</td><td>哪一天檢查、偏離多少才調</td></tr>
<tr><td>大跌時</td><td>跌 20%、30% 時要做什麼、不做什麼</td></tr>
</tbody></table></div>
<p>再用三題檢討四週的紀錄：一、每一筆有沒有寫理由和出場條件？二、手續費和交易稅一共多少？三、哪幾筆是照計畫、哪幾筆是被情緒推著走？</p>
<p>檢討看的是<b>決策品質</b>，不是賺多少。賺錢但沒照計畫，是運氣；賠錢但照計畫、賠在範圍內，是好的練習。</p>`,
      example: {
        name: '計畫書要撐得過的三種情境',
        body: `
<ul>
<li><b>一年跌兩成以上</b>：2022 年加權指數全年跌 22.4%。</li>
<li><b>一天跌 6% 以上</b>：2026/7/17 加權指數一天跌 6.47%。</li>
<li><b>漲很多，但中間很顛簸</b>：0050 從成立到 2026 年 5 月底，含息報酬 2208%（年化約 14.94%）。但這段時間裡，加權指數在 2008 年從 9,295.20 點跌到 4,089.93 點，跌了超過一半。</li>
</ul>
<p>寫完計畫書，拿這三個情境問自己：照這份計畫，我做得到嗎？做不到，就把股票比例調低，直到做得到為止。</p>`,
        sources: [S.tw2022, S.crash0717, S.etf0050ret, S.tw2008]
      },
      practice: `
<ol>
<li>照六個欄位寫好你的計畫書，存在手機最容易打開的地方。</li>
<li>打開${TOOLS}的「我的交易紀錄」，看持股摘要，照三題檢討，每題寫一到兩行。</li>
<li>把檢討出來要改的地方，直接改進計畫書（第 30 課會整理成投資原則初版）。</li>
</ol>`,
      question: '四週下來你賺了 5%，但檢討發現一半的交易沒有寫出場條件。這算練習成功嗎？',
      answer: `<p>只算一半。賺錢可能來自這段時間大盤漲，不一定是方法好。沒寫出場條件的交易，碰到大跌時最容易失控。下個月的目標，應該是每一筆都有完整的計畫。</p>`,
      points: [
        '計畫書六欄：目標、預備金、配置、買法、再平衡、大跌時。',
        '檢討看決策品質，不只是看賺賠。',
        '做不到的計畫，就把股票比例調低。'
      ]
    },

    // ===================== 第 5 週：第一個月總結＋美股和看盤 App =====================

    {
      day: 29, week: 5,
      title: '投資心理：新手最常犯的錯',
      goal: '認識最常見的幾種心理陷阱，對照自己的交易紀錄，找出你最容易犯的那一個。',
      explain: `
<ul>
<li><b>追高殺低</b>：漲了好幾天才敢買，跌的時候怕更慘而賣。像看到排隊人潮才跟著排，排到時已經漲價。</li>
<li><b>捨不得認賠</b>：賠錢的痛比賺錢的快樂強烈很多，所以賠錢的股票抱著不賣、賺錢的急著賣。</li>
<li><b>以為會一直這樣</b>：最近一直漲，就以為會一直漲；最近一直跌，就以為會一直跌。</li>
<li><b>只看想看的</b>：買了以後，只看支持自己看法的新聞。</li>
<li><b>太有自信</b>：賺了幾次就放大金額、頻繁進出，手續費和交易稅一點一點吃掉報酬。</li>
<li><b>聽明牌、重押、沒計畫地攤平</b>：別人說會漲就買；一檔占大部分資金；越跌越買只是不想承認看錯。</li>
</ul>
<p>對付情緒最好的方法不是意志力，而是規則。定期定額、計畫書、再平衡、事先寫好的停損，都是讓你「不用在當下做決定」。</p>`,
      example: {
        name: '恐慌賣出的代價（2025 年 4 月）',
        body: `
<p>2025/4/7 台股一天跌 2,065.87 點，收 19,232.35 點；4/9 再跌到 17,391.76 點，是那一年最低的收盤。</p>
<p>在最恐慌時全部賣掉的人，錯過了後面的回升：2025 年全年加權指數漲 25.74%，到 2026/10/22 收 46,041.43 點。</p>
<p>這不代表「跌了一定會漲回來」，而是提醒：恐慌時做的決定，常常是最糟的決定。</p>`,
        sources: [S.crash0407, S.tw0409, S.tw2025, S.taiex1022]
      },
      practice: `
<ol>
<li>打開${TOOLS}的「我的交易紀錄」，逐筆看你這幾週的買賣。</li>
<li>每一筆標上：有沒有照計畫？有沒有犯上面哪一個錯？</li>
<li>算一下你付了多少手續費和交易稅，占交易金額的百分之幾。</li>
<li>挑出你最常犯的那一個錯，寫一條規則專門防它。</li>
</ol>`,
      question: '你的股票一週跌了 15%，你很慌。按下賣出前，先問自己哪三個問題？',
      answer: `<p>一、當初買它的理由還在嗎？二、碰到我事先寫的停損條件了嗎？三、如果今天手上沒有它，我會用現在的價格買嗎？想清楚再決定。如果它是大盤 ETF，再加一題：我的配置是不是放太多在股票？</p>`,
      points: [
        '最常見的錯：追高殺低、捨不得認賠、以為會一直這樣。',
        '太有自信就會頻繁進出，成本一點一點吃掉報酬。',
        '對付情緒靠規則，不靠意志力。'
      ]
    },

    {
      day: 30, week: 5,
      title: '第一個月總結：寫下投資原則初版',
      goal: '把一個月學的寫成投資原則初版，帶著它進入第二個月。',
      explain: `
<p class="term-note"><b>投資原則</b>＝你自己事先寫好、而且會照做的規則。像出國前排好的預算表。</p>
<p>初版至少包含：</p>
<ul>
<li><b>資金</b>：只用閒錢；緊急預備金先留好。</li>
<li><b>配置</b>：股票和現金的比例、核心和衛星的比例、單一公司上限（包括 ETF 裡的）。</li>
<li><b>核心</b>：買哪一檔大盤 ETF、每月定期定額多少。</li>
<li><b>衛星個股流程</b>：找看得懂的公司 → 跑第 14 課的檢查表 → 用均線和指標決定時機 → 用公式算部位、寫好停損 → 每月追營收、每季看財報。</li>
<li><b>再平衡</b>：哪一天、偏離多少才調。</li>
<li><b>禁止事項</b>：不融資、不融券、不當沖、不聽明牌、錢不夠不下單。</li>
<li><b>檢討</b>：每月看一次交易紀錄，每年檢查一次計畫書。</li>
</ul>`,
      example: {
        name: '接下來的練習節奏',
        body: `
<ul>
<li><b>第 1 個月</b>：定期定額照扣，不管漲跌；每月 10 號查持股的營收；每週五看一次週 K、均線和法人。</li>
<li><b>第 2 個月</b>：追蹤一次完整的法說會。台積電每季一次，2026 年分別在 1/15、4/16、7/16、10/15 公布季報。</li>
<li><b>第 3 個月</b>：做一次三個月的完整檢討，決定衛星資金要不要調整。</li>
<li><b>每年 1 月</b>：再平衡，並更新計畫書。</li>
</ul>
<p>第二個月的課會往四個方向加深：美股和看盤 App、估值、技術面進階、產業和總經。第 60 課再把原則改成正式版。</p>`,
        sources: [S.tsmcY25, S.tsmcQ1, S.tsmcQ2, S.tsmcQ3]
      },
      practice: `
<ol>
<li>把上面七類原則，每一類寫一到兩條，存在手機最容易打開的地方。</li>
<li>把第 28 課的計畫書和檢討出來要改的規則加進去。</li>
<li>在行事曆設好提醒：每月 10 號查營收、每月最後一個週末檢討、每年 1 月再平衡。</li>
<li>每次想衝動下單前，先把原則讀一遍。</li>
</ol>`,
      question: '如果你的原則只能留一條，你會留哪一條？',
      answer: `<p>沒有標準答案。很多人會留「只用閒錢，不借錢」。只要做到這條，就算看錯，也不會影響生活，你就永遠有機會繼續學下去、繼續留在市場裡。</p>`,
      points: [
        '把一個月的經驗寫成投資原則初版。',
        '核心 ETF 長期定期定額，衛星個股照流程練習。',
        '照規則做幾個月、虧損都在範圍內，才考慮放大金額。'
      ]
    },

    // ===================== 第 5 週（續）：美股和看盤 App =====================

    {
      day: 31, week: 5,
      title: '報價畫面每一格：本益比 TTM、市值、成交額',
      goal: '打開任何一檔股票的報價畫面，能說出每一格在講什麼，並自己算一次本益比和市值。',
      explain: `
<p>不管是券商 App 還是富途牛牛，報價畫面大致是這幾格：</p>
<div class="table-wrap"><table>
<thead><tr><th>欄位</th><th>意思</th></tr></thead>
<tbody>
<tr><td>今開／最高／最低</td><td>今天第一筆、最高、最低的成交價（富途叫「開市」）</td></tr>
<tr><td>昨收（前收）</td><td>前一個交易日的收盤價，今天的漲跌都跟它比</td></tr>
<tr><td>成交量／成交額</td><td>今天成交了多少股、多少錢</td></tr>
<tr><td>市值</td><td>股價 × 全部股數：整家公司在市場上值多少</td></tr>
<tr><td>本益比（市盈率）</td><td>股價是每股盈餘的幾倍</td></tr>
<tr><td>52 週最高／最低</td><td>過去一年的最高價和最低價</td></tr>
</tbody></table></div>
<p class="term-note"><b>本益比 TTM</b>＝用<b>最近四季</b>每股盈餘加起來算的本益比。TTM 是英文「過去 12 個月」的縮寫，富途的<b>市盈率 TTM</b> 就是它。<b>市盈率（靜）</b>用上一個完整年度的獲利，<b>市盈率（動）</b>用預估的未來獲利。各 App 的算法可能不同，點欄位旁的說明確認。</p>
<p>台灣證交所公布的本益比，也是用最近四季的獲利算；公司虧錢時不計算本益比。</p>
<p>本益比要跟<b>自己的過去</b>、<b>同產業</b>和<b>成長速度</b>一起比。本益比好幾百倍，代表股價裡放了非常大的期待；只要成長慢下來，股價就可能修正很多。</p>`,
      example: {
        name: '自己算台積電的本益比 TTM 和市值', code: '2330',
        body: `
<ul>
<li>最近四季每股盈餘：2025 年第 4 季 19.50 元、2026 年第 1 季 22.08 元、第 2 季 27.25 元、第 3 季 29.43 元，加起來 98.26 元。</li>
<li>2026/10/22 收盤 2,385 元。本益比 TTM ＝ 2,385 ÷ 98.26 ≈ <b>24.3 倍</b>。</li>
<li>普通股約 259.32 億股。市值 ≈ 2,385 元 × 259.32 億股 ≈ <b>61.8 兆元</b>。</li>
</ul>
<p>如果改用 2025 全年每股盈餘 66.25 元算（像「靜態」本益比），會得到 2,385 ÷ 66.25 ≈ 36.0 倍。同一個股價，用不同時段的獲利，本益比差了一大截。所以看本益比，先看它用的是哪一段獲利。</p>`,
        sources: [S.tsmcQ4_25, S.tsmcQ1Pr, S.tsmcQ2, S.tsmcQ3, S.close1022, S.tsmcShares, S.tsmcY25]
      },
      practice: `
<ol>
<li>打開你持有那檔的報價畫面，把上面表格的每一格抄下來。</li>
<li>自己算一次本益比 TTM：查最近四季的每股盈餘（公開資訊觀測站或 App 的財務頁），用今天收盤價除以四季加總，跟 App 顯示的比對。</li>
<li>在富途牛牛打開一檔你關注的美股，記下市盈率 TTM、市盈率（靜）和市值。如果本益比超過 100 倍，寫一句：它的股價裡放了什麼期待？</li>
</ol>`,
      practiceSources: [S.futuPE, S.futuPE2, S.twsePE],
      question: '兩檔股票本益比都是 25 倍。A 每年獲利成長 30%，B 的獲利三年都沒成長。哪一檔比較「便宜」？',
      answer: `<p>如果 A 真的能再成長 30%，用明年的獲利算，本益比會降到大約 19 倍（25 ÷ 1.3），比較便宜；B 的獲利不成長，25 倍就一直是 25 倍。本益比要跟成長一起看。但前提是 A 的成長能持續，成長一放慢，高本益比就會被修正。</p>`,
      points: [
        '報價畫面：開高低收、昨收、量和額、市值、本益比。',
        '本益比 TTM 用最近四季獲利，靜態用去年，動態用預估。',
        '本益比要跟自己的過去、同產業和成長速度一起比。'
      ]
    },

    {
      day: 32, week: 5,
      title: '晨星評等和護城河：好公司 vs 好價格',
      goal: '看懂晨星（Morningstar）的公允價值、星等和護城河，分清楚「好公司」和「好價格」是兩件事。',
      explain: `
<p>富途牛牛的研報區常看到<b>晨星</b>的報告。晨星是一家投資研究公司，會替股票打這幾種評等：</p>
<ul>
<li><b>公允價值</b>：分析師估計這家公司每股「值多少錢」。</li>
<li><b>星等（1～5 顆星）</b>：拿現在的股價跟公允價值比。4～5 顆星代表股價明顯低於公允價值，3 顆星接近，1～2 顆星明顯高於。每天收盤後重算。</li>
<li><b>護城河</b>：公司能不能長期賺得比別人多。<b>寬</b>：非常有把握能維持 10 年以上；<b>窄</b>：比較可能維持 10 年；<b>無</b>：都不是。</li>
<li><b>不確定性</b>：越難預測的公司，股價要比公允價值低越多，才拿得到 5 顆星。</li>
</ul>
<p class="term-note"><b>護城河</b>＝讓對手很難搶走生意的優勢，像城堡外面那條河。晨星列了五種來源：成本優勢、無形資產（品牌、專利）、轉換成本、規模效率、網路效應。</p>
<p>重點是：<b>好公司不等於好價格</b>。寬護城河的公司，股價如果已經很貴，可能只有 1～2 顆星。長期投資兩個都要看：先確定是好公司，再等合理的價格。</p>`,
      example: {
        name: '台積電：護城河的線索，和分歧的目標價', code: '2330',
        body: `
<ul>
<li><b>賺得比別人多</b>：2026 年第三季毛利率 66.4%、營益率 58.7%。對照第 11 課，鴻海 2026 年第二季毛利率是 6.12%。同樣做電子業，每 100 元營收留下的毛利差了大約十倍。</li>
<li><b>價格</b>：10/16 收 2,420 元，同一天整理的內外資目標價從 3,090 元到 5,000 元。第 31 課算過，10/22 的本益比 TTM 約 24 倍。</li>
</ul>
<p>毛利率高、而且長期維持，是護城河的線索；但這家公司值多少錢，分析師的看法差很多。好公司可以先確定，「好價格」還是要自己判斷。</p>`,
        sources: [S.tsmcQ3, S.hhQ2, S.tsmcTarget, S.close1022]
      },
      practice: `
<ol>
<li>在富途牛牛打開一檔美股的晨星研報，找出公允價值、星等和護城河評等。</li>
<li>用現在的股價除以公允價值：是打幾折，還是貴了幾成？跟星等一致嗎？</li>
<li>替你持有的一檔台股寫一句：它的護城河是五種裡的哪一種？說不出來的話，把它放在衛星，不要放核心。</li>
</ol>`,
      practiceSources: [S.msStars, S.msMoat, S.msMoat5, S.msUnc],
      question: '一家公司有寬護城河，但晨星只給 1 顆星。這代表什麼？',
      answer: `<p>公司本身很好，但現在的股價明顯高於晨星估的公允價值。好公司買貴了，報酬也可能很差。可以先放進觀察清單，等價格回到合理區間再分批買。</p>`,
      points: [
        '公允價值估「值多少」，星等看「現在貴不貴」。',
        '護城河分寬、窄、無，有五種來源。',
        '好公司不等於好價格，兩個都要看。'
      ]
    },

    {
      day: 33, week: 5,
      title: '怎麼買美股：複委託 vs 海外券商',
      goal: '分清楚兩種買美股的管道，知道各自的費用、保障和風險，再決定要用哪一種。',
      explain: `
<p>台灣人買美股，主要有兩條路：</p>
<ul>
<li><b>複委託</b>：在台灣的券商開複委託帳戶，請台灣券商幫你下美股的單。開戶、出問題的處理都在台灣。</li>
<li><b>海外券商</b>：直接在國外的券商開戶，例如富途、Firstrade、盈透這類。帳戶在國外，受當地的法規管。</li>
</ul>
<div class="table-wrap"><table>
<thead><tr><th></th><th>複委託</th><th>海外券商</th></tr></thead>
<tbody>
<tr><td>開戶和糾紛</td><td>在台灣處理</td><td>在國外處理</td></tr>
<tr><td>手續費</td><td>常見約 0.1%～0.5%，多數每筆最低 15～30 美元</td><td>各家不同，開戶前看清楚</td></tr>
<tr><td>台灣的保障</td><td>在金管會監管下</td><td>沒有台灣核准的業者，出糾紛時拿不到台灣金融消費者的保障</td></tr>
<tr><td>美國遺產稅</td><td>要看</td><td>一樣要看，繼承手續要跟國外券商辦</td></tr>
</tbody></table></div>
<p class="term-note"><b>監管</b>＝政府機關盯著這家公司有沒有守規矩、出事時有沒有人管。像餐廳有沒有衛生局在檢查。</p>
<p>不管用哪一種：先查清楚業者受哪個國家監管、錢放在哪裡。看盤用哪個 App 都可以；下單的帳戶，要選出事時找得到人的。</p>`,
      example: {
        name: '金管會和各國對跨境券商的處理',
        body: `
<ul>
<li><b>2017 年</b>：金管會證期局表示老虎證券在台招攬屬於非法；投資人和非法業者有糾紛時，無法得到金融消費者應有的保障。</li>
<li><b>2020 年</b>：金管會表示 eToro 等業者透過網路平台招攬國人投資，已移送檢調偵辦。</li>
<li><b>2026/5/22</b>：中國證監會以非法跨境經營為由，處罰富途、老虎、長橋三家券商。</li>
</ul>
<p>這不代表海外券商一定有問題，而是提醒：管道不同，出事時的保障就不同。用之前先弄清楚自己站在哪一邊的法律保護裡。</p>`,
        sources: [S.tiger2017, S.etoro2020, S.csrc0522, S.subFee, S.usEstate]
      },
      practice: `
<ol>
<li>如果你在富途有交易帳戶，查清楚：帳戶開在哪一家公司、受哪個國家的機關監管、出問題時找誰。</li>
<li>問你現在的台灣券商：複委託的手續費率、每筆最低收費、能不能定期定額買美股 ETF。</li>
<li>寫下你的決定：美股用哪個管道買、看盤用哪個 App，以及理由。</li>
</ol>`,
      question: '朋友說：「海外券商手續費比較便宜，當然選海外券商。」除了手續費，你還會比較什麼？',
      answer: `<p>監管和保障（出事時有沒有台灣的管道可以申訴）、資金怎麼匯出匯入和匯費、繼承手續、稅務資料好不好整理。小額長期投資的人，手續費差一點，可能不如「出事找得到人」重要。</p>`,
      points: [
        '買美股兩條路：台灣券商複委託，或國外券商直接開戶。',
        '複委託在台灣處理糾紛；沒有台灣核准的業者，拿不到台灣的保障。',
        '看盤用哪個 App 都行，下單帳戶要選出事找得到人的。'
      ]
    },

    {
      day: 34, week: 5,
      title: '美股的稅：股利預扣、海外所得和遺產',
      goal: '買美股之前，先知道三件和稅有關的事：股利被預扣 30%、海外所得怎麼算、美國遺產稅。',
      explain: `
<p class="term-note"><b>預扣</b>＝錢還沒到你手上，就先被扣掉。像薪水先扣掉勞健保才入帳。</p>
<ul>
<li><b>股利預扣 30%</b>：美國公司或 ETF 配股利給台灣人，美國會先扣 30% 的稅。台美之間的避免雙重課稅法案，到 2026 年 4 月還沒有生效，所以目前沒有比較低的稅率。</li>
<li><b>海外所得</b>：在台灣，海外所得（例如美股股利、賣美股賺的價差）屬於「最低稅負制」。一個申報戶一年未滿 100 萬元不用計入；100 萬元以上要全部計入。基本所得額超過 750 萬元（115 年度）的部分，才按 20% 算稅。海外所得要自己申報。</li>
<li><b>美國遺產稅</b>：不是美國人，過世時留在美國的資產（包括美股）也可能要繳美國遺產稅。不管是複委託還是海外券商都一樣。</li>
</ul>
<p>對長期投資的影響：股利被扣的部分，就是報酬少掉的部分；配息越多，被扣得越多。所以挑美國 ETF 時，除了費用，也要記得這 30%。</p>
<p>每個人的狀況不同，金額大的時候，先問會計師或國稅局。</p>`,
      example: {
        name: '財政部公告的 2026 年門檻，和一次股利試算',
        body: `
<ul>
<li>財政部 2025/11/19 公告：115 年度（2026 年的所得），個人基本所得額在 750 萬元以下免繳；超過的部分按 20% 計算基本稅額。</li>
<li>高雄國稅局說明：海外所得一個申報戶全年未滿 100 萬元免計入，100 萬元以上要全數計入，而且要自己申報。</li>
<li>試算：假設你的美國 ETF 一年配了 1,000 美元股利，美國先扣 30%，你實際收到 700 美元。</li>
</ul>
<p>多數小額投資人的海外所得遠低於 100 萬元，台灣這邊通常不用多繳；但美國那 30%，在配息時就已經先扣了。</p>`,
        sources: [S.amt115, S.amtOverseas, S.irs515, S.treaty, S.usEstate]
      },
      practice: `
<ol>
<li>如果你有美股或美國 ETF，查最近一次配息：配了多少、實際入帳多少？差額是不是 30%？</li>
<li>估算你一年的海外所得（股利加上賣股票的價差），離 100 萬元還有多遠？</li>
<li>把你在美國的資產總額記下來，並讓家人知道帳戶在哪一家券商。</li>
</ol>`,
      question: '你今年在美股賺了 5 萬元台幣的價差，加上 1 萬元台幣的股利。台灣這邊要繳稅嗎？',
      answer: `<p>海外所得一年合計 6 萬元，遠低於 100 萬元，不用計入基本所得額，台灣這邊不用多繳。但美國在配息時已經先扣了 30% 的股利稅。（金額大或情況特殊時，要問會計師或國稅局。）</p>`,
      points: [
        '美股股利，美國會先扣 30%。',
        '海外所得一戶一年 100 萬元以上才計入，基本所得額超過 750 萬元才要繳。',
        '美股也在美國遺產稅的範圍內，讓家人知道帳戶在哪。'
      ]
    },

    {
      day: 35, week: 5, review: true,
      title: '實戰日：用富途牛牛讀懂一檔股票',
      goal: '把第 15～34 課學的，套在一檔你關注的股票上：從報價、圖表、指標到評級，完整讀一次並寫出結論。',
      explain: `
<p>照這七步，一格一格讀：</p>
<div class="table-wrap"><table>
<thead><tr><th>步驟</th><th>看什麼</th></tr></thead>
<tbody>
<tr><td>1 報價</td><td>昨收、成交額、市值、本益比 TTM 和靜態</td></tr>
<tr><td>2 時段</td><td>現在是盤前、正常交易、盤後還是夜盤？非正常時段的價格只當參考</td></tr>
<tr><td>3 週 K</td><td>大方向：MA20、MA60 往上還是往下</td></tr>
<tr><td>4 日 K</td><td>最近幾根 K 線和成交量</td></tr>
<tr><td>5 指標</td><td>MACD、KD、RSI 偏熱、偏冷還是中間</td></tr>
<tr><td>6 評級</td><td>目標價最高、平均、最低；晨星星等和護城河</td></tr>
<tr><td>7 結論</td><td>適合放核心、衛星，還是只觀察？</td></tr>
</tbody></table></div>
<p>開始前先確認顏色設定。富途的<b>報價顏色</b>是跟昨收比，<b>K 線顏色</b>是跟當天開盤比，所以有時候報價是跌、K 線卻是漲的那一種。</p>`,
      example: {
        name: '用七步讀台積電（2026/10/22）', code: '2330',
        body: `
<ol>
<li><b>報價</b>：收 2,385 元、跌 35 元，收在當天最低。本益比 TTM 約 24.3 倍，市值約 61.8 兆元（第 31 課）。</li>
<li><b>時段</b>：台股 13:30 收盤；10/23 颱風、10/26 補假休市，下一個交易日是 10/27。</li>
<li><b>均線</b>：跌到季線位置下方；外資近期賣超。</li>
<li><b>評級</b>：10/16 整理的內外資目標價，從 3,090 元到 5,000 元。</li>
<li><b>結論</b>：基本面強、分析師看多，但短線價格偏弱。0050 裡已經有約六成是台積電，要放核心還是衛星，先算「合起來」占多少。</li>
</ol>
<p>指標的數字每天在變，這裡不寫死；練習時請自己在 App 上讀當天的 MACD、KD、RSI。</p>`,
        sources: [S.close1022, S.tsmcShares, S.tsmcQ3, S.closed1023, S.ma1018, S.tsmcTarget, S.w0050]
      },
      practice: `
<ol>
<li>選一檔你在富途牛牛最常看的股票（美股或台股都可以），照七個步驟逐格填。</li>
<li>每一步寫一句白話，例如「市盈率 TTM 400 倍：股價裡放了很大的期待」。</li>
<li>最後寫結論：核心、衛星，還是只觀察？理由是什麼？存進${TOOLS}的交易紀錄備註或你的筆記。</li>
</ol>`,
      practiceSources: [S.futuColor, S.futuQuoteColor, S.futuNight, S.futuRsi],
      question: '某檔股票今天的報價顯示下跌，但今天的 K 線卻是「收比開高」的漲 K。怎麼會這樣？',
      answer: `<p>報價的漲跌是跟昨收比，K 線是跟今天的開盤比。例如昨收 100 元、今天開 92 元、收 96 元：比昨天跌 4%，所以報價是跌；但收比開高 4 元，所以是一根漲 K。開低走高常常長這樣。</p>`,
      points: [
        '讀一檔股票七步：報價、時段、週 K、日 K、指標、評級、結論。',
        '報價漲跌跟昨收比，K 線顏色跟今開比。',
        '最後一定要寫結論：核心、衛星，還是只觀察。'
      ]
    },

    // ===================== 第 6～9 週：課程預告（課文查證中） =====================

    { day: 36, week: 6, draft: true, title: 'ROE：公司用股東的錢賺多少', goal: '看懂股東權益報酬率，分辨「賺很多」和「很會賺」。' },
    { day: 37, week: 6, draft: true, title: '自由現金流和配息能力', goal: '判斷一家公司的股利，是真的賺來的，還是硬撐的。' },
    { day: 38, week: 6, draft: true, title: '本益比區間：現在算便宜還是貴', goal: '用一家公司自己過去的本益比高低，判斷現在的位置。' },
    { day: 39, week: 6, draft: true, title: '股價淨值比和殖利率：金融股、電信股怎麼看', goal: '知道不同性格的公司，要用不同的尺來量。' },
    { day: 40, week: 6, draft: true, title: '成長率：年增、季增和年化成長', goal: '把營收和獲利的成長換算成可以比較的數字。' },
    { day: 41, week: 6, draft: true, title: '讀法說會簡報和年報：先看哪幾頁', goal: '花 20 分鐘抓到一家公司最重要的資訊。' },
    { day: 42, week: 6, review: true, draft: true, title: '實戰日：替一家公司估一個合理價區間', goal: '用本益比區間和成長率，替一家公司寫出便宜、合理、偏貴三個價位。' },
    { day: 43, week: 7, draft: true, title: '支撐和壓力：前高、前低、整數關卡', goal: '在 K 線圖上找出大家在意的價位。' },
    { day: 44, week: 7, draft: true, title: '趨勢線和通道', goal: '畫出一條趨勢線，並知道跌破代表什麼。' },
    { day: 45, week: 7, draft: true, title: '型態：W 底、M 頭、頭肩頂', goal: '認得幾種常見的圖形，也知道它們常常失靈。' },
    { day: 46, week: 7, draft: true, title: '背離：價格和指標唱反調', goal: '看懂價格創新高、指標卻沒有跟上代表什麼。' },
    { day: 47, week: 7, draft: true, title: '多週期：月 K 定方向、週 K 找位置、日 K 下單', goal: '用三種週期一起看，避免被單一天的波動騙。' },
    { day: 48, week: 7, draft: true, title: '技術分析的限制：事後諸葛和倖存者偏差', goal: '分辨「圖看起來很準」和「真的有用」。' },
    { day: 49, week: 7, review: true, draft: true, title: '實戰日：替持股畫出支撐壓力和交易計畫', goal: '把第 7 週的工具用在自己的持股上，寫出買進、加碼、停損的價位。' },
    { day: 50, week: 8, draft: true, title: '半導體產業鏈：設計、製造、封測', goal: '看懂台股最重要的產業，誰做什麼、賺什麼錢。' },
    { day: 51, week: 8, draft: true, title: 'AI 供應鏈：從輝達到台灣廠商', goal: '知道 AI 熱潮怎麼一路傳到台股的各家公司。' },
    { day: 52, week: 8, draft: true, title: '通膨和 CPI：物價怎麼影響股市', goal: '看懂每月公布的物價數字，為什麼能讓股市大漲大跌。' },
    { day: 53, week: 8, draft: true, title: '美債殖利率和匯率', goal: '知道全世界資金的「基準利率」和新台幣匯率，怎麼牽動台股。' },
    { day: 54, week: 8, draft: true, title: '景氣循環：不同階段誰比較強', goal: '把景氣燈號、利率和產業性格放在一起看。' },
    { day: 55, week: 8, draft: true, title: '黑天鵝：疫情、關稅和地緣政治', goal: '從過去幾次大事件，學到大跌時該做和不該做的事。' },
    { day: 56, week: 8, review: true, draft: true, title: '實戰日：寫一份自己的市場週報', goal: '用一頁整理這週的大盤、利率、景氣和你的持股。' },
    { day: 57, week: 9, draft: true, title: '債券 ETF 和現金：配置裡的煞車', goal: '知道債券在資產配置裡扮演什麼角色，以及它的風險。' },
    { day: 58, week: 9, draft: true, title: '長期目標：複利、退休和提領', goal: '把投資和人生目標連起來，算出需要多少錢、多久。' },
    { day: 59, week: 9, review: true, draft: true, title: '實戰日：兩個月總檢討', goal: '用交易紀錄和計畫書，檢討兩個月的決策品質。' },
    { day: 60, week: 9, draft: true, title: '投資原則正式版和下一步', goal: '把兩個月的經驗寫成正式的投資原則，規劃之後的練習。' }
  ];
})();
