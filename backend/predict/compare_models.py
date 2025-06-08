import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from statsmodels.tsa.api import VAR
import xgboost as xgb

from tensorflow.keras import Sequential
from tensorflow.keras.layers import LSTM, Dense
from sklearn.preprocessing import StandardScaler

from darts import TimeSeries
from darts.models import RNNModel

from predict.construct_data import construct_data


def prepare_multivariate_df(data_responses, location="test_room"):
    df = pd.DataFrame([d.dict() for d in data_responses if d.location == location])
    df = df.pivot_table(index='timestamp', columns='sensor_type', values='value')
    df = df.sort_index()
    df = df.resample("15T").mean().interpolate("time")  # 15-minute intervals
    return df.dropna()


def train_test_split(df, horizon=192):  # 192 x 15min = 2 days
    train = df.iloc[:-horizon]
    test = df.iloc[-horizon:]
    return train, test


def evaluate_predictions(true, pred):
    return {
        "MAE": mean_absolute_error(true, pred),
        "RMSE": np.sqrt(mean_squared_error(true, pred))
    }


def run_var(train_df, test_df):
    model = VAR(train_df)
    fit = model.fit(maxlags=24)
    forecast = fit.forecast(train_df.values[-fit.k_ar:], steps=len(test_df))
    pred_df = pd.DataFrame(forecast, index=test_df.index, columns=train_df.columns)
    return pred_df


def create_lag_features(df, lags=[1, 2, 4, 8]):
    X, y = [], []
    for i in range(max(lags), len(df)):
        features = []
        for lag in lags:
            features += df.iloc[i-lag].values.tolist()
        X.append(features)
        y.append(df.iloc[i].values)
    return np.array(X), np.array(y), df.columns


def run_xgb(train_df, test_df, lags=[1, 2, 4, 8]):
    X, y, columns = create_lag_features(train_df, lags)
    model = xgb.XGBRegressor(n_estimators=100, objective="reg:squarederror")
    model.fit(X, y)

    # Forecast iteratively
    last_vals = train_df.values[-max(lags):]
    preds = []
    for _ in range(len(test_df)):
        features = []
        for lag in lags:
            features += last_vals[-lag].tolist()
        pred = model.predict(np.array([features]))[0]
        preds.append(pred)
        last_vals = np.vstack([last_vals, pred])[1:]

    return pd.DataFrame(preds, index=test_df.index, columns=columns)


def run_lstm(train_df, test_df, lookback=24):
    scaler = StandardScaler()
    train_scaled = scaler.fit_transform(train_df)
    X, y = [], []
    for i in range(lookback, len(train_scaled)):
        X.append(train_scaled[i-lookback:i])
        y.append(train_scaled[i])
    X, y = np.array(X), np.array(y)

    model = Sequential()
    model.add(LSTM(64, input_shape=(lookback, X.shape[2])))
    model.add(Dense(y.shape[1]))
    model.compile(optimizer='adam', loss='mse')
    model.fit(X, y, epochs=20, batch_size=32, verbose=1)

    # Forecast
    last_seq = train_scaled[-lookback:]
    preds = []
    for _ in range(len(test_df)):
        p = model.predict(last_seq[np.newaxis, :, :])[0]
        preds.append(p)
        last_seq = np.vstack([last_seq[1:], p])
    inv_preds = scaler.inverse_transform(preds)
    return pd.DataFrame(inv_preds, index=test_df.index, columns=train_df.columns)


def run_darts(train_df, test_df):
    series = TimeSeries.from_dataframe(train_df)
    model = RNNModel(model="LSTM", input_chunk_length=24, output_chunk_length=1, n_epochs=50)
    model.fit(series)
    pred = model.predict(len(test_df))
    return pred.to_dataframe()


def compare_all(data_responses):
    df = prepare_multivariate_df(data_responses)
    train, test = train_test_split(df)

    results = {}
    # VAR
    print("run var")
    pred_var = run_var(train, test)
    results['VAR'] = evaluate_predictions(test, pred_var)
    print(results)

    # XGBoost
    print("run xgboost")
    pred_xgb = run_xgb(train, test)
    results['XGBoost'] = evaluate_predictions(test, pred_xgb)
    print(results)

    # LSTM
    print("run lstm")
    pred_lstm = run_lstm(train, test)
    results['LSTM'] = evaluate_predictions(test, pred_lstm)
    print(results)

    # Darts
    print("run darts")
    pred_darts = run_darts(train, test)
    print(f"results: {pred_darts}")
    results['Darts'] = evaluate_predictions(test, pred_darts)

    return results


if __name__ == '__main__':
    data = construct_data("./DATA-large.CSV")
    print(compare_all(data))
