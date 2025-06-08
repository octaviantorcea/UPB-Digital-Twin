import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from statsmodels.tsa.api import VAR
from tensorflow.keras import Sequential
from tensorflow.keras.layers import LSTM, Dense

from predict.construct_data import construct_data


def prepare_multivariate_df(data_responses, location="test_room"):
    df = pd.DataFrame([d.dict() for d in data_responses if d.location == location])
    df = df.pivot_table(index='timestamp', columns='sensor_type', values='value')
    df = df.sort_index()
    df = df.resample("15T").mean().interpolate("time")  # 15-minute intervals
    return df.dropna()


def train_test_split(df, horizon=192):
    train = df.iloc[:-horizon]
    test = df.iloc[-horizon:]
    return train, test


def smape(y_true, y_pred):
    return 100 * np.mean(
        2 * np.abs(y_pred - y_true) / (np.abs(y_true) + np.abs(y_pred) + 1e-8)
    )


def mase(y_true, y_pred, y_naive):
    mae_model = np.mean(np.abs(y_true - y_pred))
    mae_naive = np.mean(np.abs(y_true - y_naive))
    return mae_model / (mae_naive + 1e-8)


def evaluate_predictions(true, pred):
    true = true.values
    pred = pred.values

    # Naive forecast (lag-1 persistence model)
    naive_forecast = np.roll(true, 1, axis=0)
    naive_forecast[0, :] = true[0, :]  # fill first row

    metrics = {
        "MAE": mean_absolute_error(true, pred),
        "RMSE": np.sqrt(mean_squared_error(true, pred)),
        "MSE": mean_squared_error(true, pred),
        "R2": r2_score(true, pred),
        "MAPE": np.mean(np.abs((true - pred) / (true + 1e-8))) * 100,
        "sMAPE": smape(true, pred),
        "MASE": mase(true, pred, naive_forecast)
    }
    return metrics


def plot_predictions(test_df, pred_df, model_name, sensors_to_plot=["temperature", "humidity", "lux", "pressure"]):
    plt.figure(figsize=(15, 5 * len(sensors_to_plot)))
    for i, sensor in enumerate(sensors_to_plot):
        if sensor not in test_df.columns:
            continue
        plt.subplot(len(sensors_to_plot), 1, i + 1)
        plt.plot(test_df.index, test_df[sensor], label="Actual", color='black')
        plt.plot(pred_df.index, pred_df[sensor], label=f"{model_name} Forecast", linestyle='--')
        plt.title(f"{model_name} Forecast vs Actual - {sensor}")
        plt.xlabel("Timestamp")
        plt.ylabel(sensor)
        plt.legend()
    plt.tight_layout()
    plt.savefig(f"{model_name}_forecast.png")
    plt.close()


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

    last_seq = train_scaled[-lookback:]
    preds = []
    for _ in range(len(test_df)):
        p = model.predict(last_seq[np.newaxis, :, :])[0]
        preds.append(p)
        last_seq = np.vstack([last_seq[1:], p])
    inv_preds = scaler.inverse_transform(preds)
    return pd.DataFrame(inv_preds, index=test_df.index, columns=train_df.columns)


def compare_all(data_responses):
    df = prepare_multivariate_df(data_responses)
    train, test = train_test_split(df)

    results = {}

    print("run var")
    pred_var = run_var(train, test)
    results['VAR'] = evaluate_predictions(test, pred_var)
    plot_predictions(test, pred_var, "VAR")

    print("run xgboost")
    pred_xgb = run_xgb(train, test)
    results['XGBoost'] = evaluate_predictions(test, pred_xgb)
    plot_predictions(test, pred_xgb, "XGBoost")

    print("run lstm")
    pred_lstm = run_lstm(train, test)
    results['LSTM'] = evaluate_predictions(test, pred_lstm)
    plot_predictions(test, pred_lstm, "LSTM")

    return results


if __name__ == '__main__':
    data = construct_data("./DATA-large.CSV")
    results = compare_all(data)
    print(results)
