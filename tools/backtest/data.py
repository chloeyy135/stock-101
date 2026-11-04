"""讀寫 data/history/<代號>.csv，並檢查格式。欄位：date,open,high,low,close,volume（還原後價格）。"""
import pandas as pd

COLUMNS = ['open', 'high', 'low', 'close', 'volume']


def validate(df):
    if list(df.columns) != COLUMNS:
        raise ValueError('欄位要是 ' + ','.join(COLUMNS) + '，現在是 ' + ','.join(map(str, df.columns)))
    if len(df) == 0:
        raise ValueError('沒有資料')
    if not isinstance(df.index, pd.DatetimeIndex):
        raise ValueError('索引要是日期')
    if not df.index.is_monotonic_increasing:
        raise ValueError('日期沒有由舊到新排序')
    if df.index.has_duplicates:
        raise ValueError('有重複的日期：' + str(df.index[df.index.duplicated()][0].date()))
    if df[COLUMNS].isna().any().any():
        raise ValueError('有空值')
    bad = (df['high'] < df[['open', 'close']].max(axis=1) - 1e-9) | (df['low'] > df[['open', 'close']].min(axis=1) + 1e-9) | (df['low'] <= 0)
    if bad.any():
        raise ValueError('高低價不合理：' + str(df.index[bad][0].date()))
    return df


def load_csv(path):
    df = pd.read_csv(path, parse_dates=['date'], index_col='date')
    df = df[COLUMNS].astype(float)
    df.index.name = 'date'
    return validate(df)


def save_csv(df, path):
    validate(df)
    out = df.copy()
    out.index = out.index.strftime('%Y-%m-%d')
    out.index.name = 'date'
    for c in ['open', 'high', 'low', 'close']:
        out[c] = out[c].round(4)
    out['volume'] = out['volume'].round().astype('int64')
    out.to_csv(path, float_format='%.4f')
