"""交易成本：手續費（買賣各一次，可打折）和賣出時的交易稅。"""
from dataclasses import dataclass


@dataclass(frozen=True)
class CostModel:
    fee_rate: float = 0.0       # 手續費率（台股牌告 0.1425%）
    fee_discount: float = 1.0   # 折扣（0.6 = 六折）
    tax_rate: float = 0.0       # 賣出時的交易稅（台股 ETF 0.1%、股票 0.3%）

    def buy_cost(self, amount):
        return amount * self.fee_rate * self.fee_discount

    def sell_cost(self, amount):
        return amount * self.fee_rate * self.fee_discount + amount * self.tax_rate

    def describe(self):
        fee = self.fee_rate * self.fee_discount * 100
        return '手續費 %.4g%%（買賣各一次）、交易稅 %.3g%%' % (fee, self.tax_rate * 100)


FREE = CostModel()


def from_config(cfg, market, kind):
    m = cfg[market]
    return CostModel(fee_rate=float(m.get('fee_rate', 0)), fee_discount=float(m.get('fee_discount', 1)),
                     tax_rate=float(m.get('tax', {}).get(kind, 0)))
