import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from prophet import Prophet
import xgboost as xgb
from pmdarima import auto_arima
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from predict.construct_data_two import construct_data_two


# --- Helper Functions ---
def smape(y_true, y_pred):
    return 100 * np.mean(
        2 * np.abs(y_pred - y_true) / (np.abs(y_true) + np.abs(y_pred) + 1e-8)
    )


def mase(y_true, y_pred, naive_forecast):
    return np.mean(np.abs(y_true - y_pred)) / (np.mean(np.abs(y_true - naive_forecast)) + 1e-8)


def evaluate_predictions(y_true, y_pred):
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    naive = np.roll(y_true, 1)
    naive[0] = y_true[0]
    return {
        "MAE": mean_absolute_error(y_true, y_pred),
        "RMSE": np.sqrt(mean_squared_error(y_true, y_pred)),
        "MSE": mean_squared_error(y_true, y_pred),
        "R2": r2_score(y_true, y_pred),
        "MAPE": np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100,
        "sMAPE": smape(y_true, y_pred),
        "MASE": mase(y_true, y_pred, naive),
    }


def prepare_sensor_series(data_responses, sensor_type, location="test_room"):
    # Build a one-column dataframe with a DatetimeIndex
    df = pd.DataFrame([
        {"timestamp": d.timestamp, "value": d.value}
        for d in data_responses
        if d.sensor_type == sensor_type and d.location == location
    ])
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.set_index("timestamp").sort_index()
    df = df.resample("h").mean().interpolate("time")
    return df


def train_test_split(df, horizon=48):
    return df.iloc[:-horizon], df.iloc[-horizon:]


def plot_forecast(test, pred, model_name, sensor):
    plt.figure(figsize=(14, 3))
    plt.plot(test.index, test["value"], label="Actual", color="black")
    plt.plot(pred.index, pred.values, label="Forecast", linestyle="--")
    plt.title(f"{model_name} Forecast vs Actual — {sensor}")
    plt.xlabel("Time")
    plt.ylabel(sensor)
    plt.legend()
    plt.tight_layout()
    plt.savefig(f"{model_name}_{sensor}_forecast.png")
    plt.close()


# --- Models ---
def run_sarima(train, test):
    train_short = train[-2200:]
    model = auto_arima(
        train_short,
        start_p=1, start_q=1,
        max_p=2, max_q=2,  # reduce from default (5)
        d=None,  # let it infer
        seasonal=True,
        start_P=0, start_Q=0,
        max_P=1, max_Q=1,  # reduce seasonal orders
        D=None,
        m=24,  # hourly seasonality (daily pattern)
        trace=False,
        stepwise=True,  # faster stepwise algorithm
        error_action="ignore",  # skip non-converging models
        suppress_warnings=True,
        n_fits=10  # optional: cap number of models
    )
    forecast = model.predict(n_periods=len(test))
    return pd.Series(forecast, index=test.index)


def run_prophet(train_df, test_df):
    df_train = train_df.reset_index().rename(columns={"timestamp": "ds", "value": "y"})
    df_train['ds'] = pd.to_datetime(df_train['ds']).dt.tz_localize(None)

    model = Prophet(
        daily_seasonality=True,
        weekly_seasonality=False,
        yearly_seasonality=False
    )
    model.fit(df_train)

    future = test_df.reset_index().rename(columns={"timestamp": "ds"})[["ds"]]
    future['ds'] = pd.to_datetime(future['ds']).dt.tz_localize(None)
    forecast = model.predict(future)
    return pd.Series(forecast["yhat"].values, index=test_df.index)


def run_xgboost(train, test, lags=[1, 2, 24, 48, 72]):
    # Create lag features on the flattened series
    vals = train["value"].values
    X, y = [], []
    for i in range(max(lags), len(vals)):
        X.append([vals[i - lag] for lag in lags])
        y.append(vals[i])
    model = xgb.XGBRegressor(objective="reg:squarederror")
    model.fit(np.array(X), np.array(y))
    preds, hist = [], list(vals[-max(lags):])
    for _ in range(len(test)):
        feat = [hist[-lag] for lag in lags]
        p = model.predict(np.array([feat]))[0]
        preds.append(p)
        hist.append(p)
    return pd.Series(preds, index=test.index)


# --- Comparison ---
def compare_per_sensor(data_responses, sensors=["temperature", "humidity", "pressure"]):
    all_results = {}
    for sensor in sensors:
        print(f"\n>>> Sensor: {sensor}")
        df = prepare_sensor_series(data_responses, sensor)
        three_months = df[-2160:]

        print(f">>>>>>length: {len(three_months)}")

        train, test = train_test_split(three_months)

        res = {}

        # SARIMA
        print("Running SARIMA...")
        pred_sarima = run_sarima(train, test)
        res["SARIMA"] = evaluate_predictions(test.values, pred_sarima.values)
        plot_forecast(test, pred_sarima, "SARIMA", sensor)

        # Prophet
        print("Running Prophet...")
        pred_prophet = run_prophet(train, test)
        res["Prophet"] = evaluate_predictions(test.values, pred_prophet.values)
        plot_forecast(test, pred_prophet, "Prophet", sensor)

        # XGBoost
        print("Running XGBoost...")
        pred_xgb = run_xgboost(train, test)
        res["XGBoost"] = evaluate_predictions(test.values, pred_xgb.values)
        plot_forecast(test, pred_xgb, "XGBoost", sensor)

        all_results[sensor] = res

    return all_results


# --- Entry Point ---
if __name__ == "__main__":
    data = construct_data_two("new_tests/small_data_set/8_bathroom/bath_EMY.csv")
    results = compare_per_sensor(data)
    import json
    with open("new_tests/small_data_set/8_bathroom/results.json", 'w') as f:
        print(json.dumps(results, indent=2), file=f)
