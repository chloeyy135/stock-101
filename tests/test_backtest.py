# 回測引擎的測試：全部用合成資料，答案事先算好。執行：python3 -m unittest discover -s tests
import json
import math
import os
import sys
import tempfile
import unittest

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))

from backtest import costs, data, engine, metrics, strategies, report  # noqa: E402


def make_df(closes, start='2020-01-01', opens=None):
    """用收盤價列表做一個合法的日 K 表；開盤預設等於前一天收盤。"""
    idx = pd.bdate_range(start, periods=len(closes))
    c = pd.Series(closes, index=idx, dtype=float)
    o = pd.Series(opens, index=idx, dtype=float) if opens is not None else c.shift(1).fillna(c.iloc[0])
    df = pd.DataFrame({'open': o, 'high': np.maximum(o, c) * 1.001, 'low': np.minimum(o, c) * 0.999,
                       'close': c, 'volume': 1000.0})
    df.index.name = 'date'
    return df


def geometric(n, daily):
    return [100 * (1 + daily) ** i for i in range(n)]


class DataTests(unittest.TestCase):
    def test_round_trip_csv(self):
        df = make_df([1, 2, 3])
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'X.csv')
            data.save_csv(df, p)
            back = data.load_csv(p)
        pd.testing.assert_frame_equal(df, back, check_freq=False)

    def test_rejects_bad_high_low(self):
        df = make_df([1, 2, 3])
        df.loc[df.index[1], 'high'] = 0.5
        with self.assertRaises(ValueError):
            data.validate(df)

    def test_rejects_unsorted_or_duplicate_dates(self):
        df = make_df([1, 2, 3])
        with self.assertRaises(ValueError):
            data.validate(df.iloc[::-1])
        dup = pd.concat([df, df.iloc[[1]]]).sort_index()
        with self.assertRaises(ValueError):
            data.validate(dup)


class CostTests(unittest.TestCase):
    def test_tw_etf_round_trip(self):
        cm = costs.CostModel(fee_rate=0.001425, fee_discount=0.6, tax_rate=0.001)
        self.assertAlmostEqual(cm.buy_cost(100000), 100000 * 0.001425 * 0.6)
        self.assertAlmostEqual(cm.sell_cost(100000), 100000 * 0.001425 * 0.6 + 100000 * 0.001)

    def test_from_config(self):
        cfg = {'tw': {'fee_rate': 0.001425, 'fee_discount': 0.6, 'tax': {'etf': 0.001, 'stock': 0.003}},
               'us': {'fee_rate': 0, 'fee_discount': 1, 'tax': {'etf': 0, 'stock': 0}}}
        self.assertAlmostEqual(costs.from_config(cfg, 'tw', 'stock').tax_rate, 0.003)
        self.assertEqual(costs.from_config(cfg, 'us', 'etf').sell_cost(1000), 0)


class StrategyTests(unittest.TestCase):
    def test_buy_hold_is_always_long(self):
        df = make_df([1, 2, 3, 4])
        pos = strategies.buy_hold(df)
        self.assertTrue((pos == 1).all())

    def test_sma_cross_changes_position_the_day_after_the_cross(self):
        # 先跌後漲：MA2 會在某天穿過 MA4，持倉要在「隔天」才變
        df = make_df([10, 9, 8, 7, 6, 7, 9, 12, 15, 18])
        pos = strategies.sma_cross(df, fast=2, slow=4)
        c = df['close']
        signal = (c.rolling(2).mean() > c.rolling(4).mean()).astype(int)
        first_signal_day = signal[signal == 1].index[0]
        self.assertEqual(pos.loc[first_signal_day], 0)
        self.assertEqual(pos.loc[df.index[df.index.get_loc(first_signal_day) + 1]], 1)
        # 慢線還算不出來的日子一律空手
        self.assertTrue((pos.iloc[:4] == 0).all())

    def test_sma_filter(self):
        df = make_df([1, 1, 1, 1, 5, 5, 5, 0.5, 0.5])
        pos = strategies.sma_filter(df, n=4)
        # 第 5 天（index 4）收盤 5 > MA4，第 6 天持有；跌破後隔天空手
        self.assertEqual(pos.iloc[5], 1)
        self.assertEqual(pos.iloc[8], 0)

    def test_dca_schedule_first_trading_day_each_month(self):
        df = make_df([1.0] * 70, start='2020-01-01')
        days = strategies.dca_dates(df)
        self.assertEqual([d.strftime('%Y-%m-%d') for d in days[:3]], ['2020-01-01', '2020-02-03', '2020-03-02'])


class EngineTests(unittest.TestCase):
    def test_buy_hold_without_cost_tracks_price(self):
        df = make_df(geometric(50, 0.01))
        res = engine.run_timing(df, strategies.buy_hold(df), costs.FREE)
        # 第一天開盤買進（開盤＝100），之後權益＝收盤／100
        np.testing.assert_allclose(res['equity'].values, df['close'].values / 100.0)
        self.assertEqual(len(res['trades']), 1)
        self.assertIsNone(res['trades'][0]['exit'])

    def test_round_trip_pays_costs(self):
        df = make_df([10, 10, 10, 10, 10], opens=[10, 10, 10, 10, 10])
        pos = pd.Series([0, 1, 1, 0, 0], index=df.index)
        cm = costs.CostModel(fee_rate=0.01, fee_discount=1, tax_rate=0.0)
        res = engine.run_timing(df, pos, cm)
        # 第 2 天開盤買（付 1%），第 4 天開盤賣（付 1%）：1 × 0.99 × 0.99
        self.assertAlmostEqual(res['equity'].iloc[-1], 0.99 * 0.99)
        self.assertEqual(len(res['trades']), 1)
        self.assertAlmostEqual(res['trades'][0]['ret'], 0.99 * 0.99 - 1)

    def test_dca_flat_price(self):
        df = make_df([10.0] * 70, opens=[10.0] * 70)
        res = engine.run_dca(df, costs.FREE, amount=1000)
        self.assertEqual(res['buys'], 4)  # 1、2、3、4 月
        self.assertAlmostEqual(res['invested'], 4000)
        self.assertAlmostEqual(res['value'].iloc[-1], 4000)
        self.assertAlmostEqual(metrics.xirr(res['cashflows']), 0.0, places=6)


class MetricTests(unittest.TestCase):
    def test_cagr_of_geometric_series(self):
        idx = pd.date_range('2020-01-01', periods=365 * 2 + 1, freq='D')  # 剛好兩年（含 2020 閏年會差一天，用 365.25 算）
        eq = pd.Series([1.21 ** (i / (len(idx) - 1)) for i in range(len(idx))], index=idx)
        self.assertAlmostEqual(metrics.cagr(eq), 0.10, places=2)

    def test_max_drawdown(self):
        idx = pd.bdate_range('2020-01-01', periods=6)
        eq = pd.Series([1.0, 2.0, 1.0, 1.5, 2.5, 2.0], index=idx)
        mdd = metrics.max_drawdown(eq)
        self.assertAlmostEqual(mdd['mdd'], -0.5)
        self.assertEqual(mdd['peak'], '2020-01-02')
        self.assertEqual(mdd['trough'], '2020-01-03')
        self.assertEqual(mdd['recovery'], '2020-01-07')
        self.assertEqual(mdd['days'], 5)

    def test_no_drawdown(self):
        eq = pd.Series([1.0, 1.1, 1.2], index=pd.bdate_range('2020-01-01', periods=3))
        self.assertEqual(metrics.max_drawdown(eq)['mdd'], 0.0)

    def test_yearly_returns(self):
        idx = pd.to_datetime(['2020-06-01', '2020-12-31', '2021-12-31', '2022-03-01'])
        eq = pd.Series([1.0, 1.5, 1.2, 1.8], index=idx)
        y = metrics.yearly_returns(eq)
        self.assertAlmostEqual(y['2020'], 0.5)
        self.assertAlmostEqual(y['2021'], -0.2)
        self.assertAlmostEqual(y['2022'], 0.5)

    def test_rolling_returns(self):
        idx = pd.date_range('2020-01-01', periods=365 * 3 + 1, freq='D')
        eq = pd.Series([1.1 ** (i / 365.25) for i in range(len(idx))], index=idx)
        r = metrics.rolling_returns(eq, years=1)
        self.assertAlmostEqual(r['min'], 0.10, places=2)
        self.assertAlmostEqual(r['max'], 0.10, places=2)
        self.assertEqual(r['pct_positive'], 1.0)
        self.assertIsNone(metrics.rolling_returns(eq, years=10))

    def test_xirr_doubling_in_one_year(self):
        flows = [(pd.Timestamp('2019-01-01'), -1000.0), (pd.Timestamp('2020-01-01'), 2000.0)]  # 剛好 365 天
        self.assertAlmostEqual(metrics.xirr(flows), 1.0, places=3)


class ReportTests(unittest.TestCase):
    def test_summarize_produces_serializable_result(self):
        df = make_df(geometric(600, 0.0005))
        cfg = {'strategies': {'buy_hold': {}, 'dca': {}, 'sma_cross': {'fast': 20, 'slow': 60}, 'sma_filter': {'n': 200}},
               'rolling_years': [1, 3], 'min_bars_for_ma': 260, 'dca_amount': {'tw': 10000, 'us': 300}}
        out = report.summarize({'id': 'T', 'name': 'Test', 'market': 'tw', 'kind': 'etf'}, df, cfg, costs.FREE)
        json.dumps(out)
        self.assertEqual(set(out['results']), {'buy_hold', 'dca', 'sma_cross', 'sma_filter'})
        m = out['results']['buy_hold']['metrics']
        self.assertTrue(m['cagr'] > 0 and m['mdd'] <= 0)
        eq = report.expand_points(out['results']['buy_hold']['equity'])
        self.assertTrue(len(eq) < 600)  # 週線取樣
        self.assertEqual(eq[-1][0], df.index[-1].strftime('%Y-%m-%d'))
        self.assertEqual(eq[0][0], out['results']['buy_hold']['equity']['from'])

    def test_long_history_caps_curve_points(self):
        df = make_df(geometric(5200, 0.0003))  # 約 20 年
        cfg = {'strategies': {'buy_hold': {}, 'dca': {}}, 'rolling_years': [1], 'min_bars_for_ma': 260, 'dca_amount': {'tw': 10000, 'us': 300}}
        out = report.summarize({'id': 'T', 'name': 'Test', 'market': 'tw', 'kind': 'etf'}, df, cfg, costs.FREE)
        eq = report.expand_points(out['results']['buy_hold']['equity'])
        self.assertLessEqual(len(eq), report.MAX_POINTS + 1)
        self.assertEqual(eq[-1][0], df.index[-1].strftime('%Y-%m-%d'))
        self.assertLessEqual(len(out['results']['dca']['equity']['v']), report.MAX_POINTS)
        # 格線上的日期要和原始週線一致
        w = out['results']['buy_hold']['equity']
        self.assertEqual(eq[1][0], (pd.Timestamp(w['from']) + pd.Timedelta(days=w['step'])).strftime('%Y-%m-%d'))

    def test_short_history_skips_ma_strategies(self):
        df = make_df(geometric(100, 0.001))
        cfg = {'strategies': {'buy_hold': {}, 'sma_cross': {'fast': 20, 'slow': 60}}, 'rolling_years': [1], 'min_bars_for_ma': 260, 'dca_amount': {'tw': 10000, 'us': 300}}
        out = report.summarize({'id': 'T', 'name': 'Test', 'market': 'us', 'kind': 'stock'}, df, cfg, costs.FREE)
        self.assertIn('buy_hold', out['results'])
        self.assertNotIn('sma_cross', out['results'])
        self.assertIn('sma_cross', out['skipped'])


if __name__ == '__main__':
    unittest.main()
