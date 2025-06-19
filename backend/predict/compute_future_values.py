import os
from datetime import date
from datetime import timedelta
from zoneinfo import ZoneInfo

import httpx
import pandas as pd
from dateutil.relativedelta import relativedelta
from pmdarima.arima import auto_arima
from prophet import Prophet
from sqlalchemy.orm import Session
from tqdm import tqdm

from predict.database_model import PressPredictedValue, TempPredictedValue, HumidPredictedValue, SessionLocal
from shared_models.sensor_data_model import DataResponse


def get_historical_data(location: str) -> tuple[list[DataResponse], list[DataResponse], list[DataResponse]]:
    today = date.today() + relativedelta(days=1)
    today_str = today.strftime('%Y-%m-%dT%H:%M:%SZ')

    three_months_ago = today - relativedelta(months=3)
    three_months_ago_str = three_months_ago.strftime('%Y-%m-%dT%H:%M:%SZ')

    with httpx.Client() as client:
        response = client.get(
            os.getenv("HIST_SENSOR_DATA"),
            params={
                "sensor_type": "temperature",
                "location": location,
                "from": three_months_ago_str,
                "to": today_str,
            }
        )
        response.raise_for_status()
        temperature_data = [DataResponse.model_validate(res) for res in response.json()] if response.json() else None

    with httpx.Client() as client:
        response = client.get(
            os.getenv("HIST_SENSOR_DATA"),
            params={
                "sensor_type": "humidity",
                "location": location,
                "from": three_months_ago_str,
                "to": today_str,
            }
        )
        response.raise_for_status()
        humidity_data = [DataResponse.model_validate(res) for res in response.json()] if response.json() else None

    with httpx.Client() as client:
        response = client.get(
            os.getenv("HIST_SENSOR_DATA"),
            params={
                "sensor_type": "pressure",
                "location": location,
                "from": three_months_ago_str,
                "to": today_str,
            }
        )
        response.raise_for_status()
        pressure_data = [DataResponse.model_validate(res) for res in response.json()] if response.json() else None

    return temperature_data, humidity_data, pressure_data


def run_sarima(train, last_timestamp):
    """
    Predict the next 2 hours in 15-minute intervals using SARIMA.

    Returns:
        list of (timestamp, predicted_value)
    """
    model = auto_arima(
        train,
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

    n_periods = 48  # 2 days = 34560 intervals of 5 seconds
    forecast = model.predict(n_periods=n_periods)

    timestamps = [last_timestamp + timedelta(hours=1 * (i + 1)) for i in range(n_periods)]
    return list(zip(timestamps, forecast))


def run_prophet(train_df, last_timestamp):
    """
    Predict the next 48 hours using Prophet.

    Args:
        train_df (pd.DataFrame): With columns ['timestamp', 'value'].
        last_timestamp (datetime): Last timestamp from training data.

    Returns:
        list of (timestamp, predicted_value)
    """
    last_timestamp = last_timestamp.replace(tzinfo=None)

    df_train = train_df.reset_index().rename(columns={"timestamp": "ds", "value": "y"})
    df_train['ds'] = pd.to_datetime(df_train['ds']).dt.tz_localize(None)

    m = Prophet(
        daily_seasonality=True,
        weekly_seasonality=False,
        yearly_seasonality=False
    )
    m.fit(df_train)

    future = pd.date_range(start=last_timestamp + timedelta(hours=1), periods=48, freq='h')
    future = future.tz_localize(None)
    future_df = pd.DataFrame({'ds': future})

    forecast = m.predict(future_df)

    return list(zip(forecast["ds"], forecast["yhat"]))


def prepare_sensor_series(data_responses):
    # Build a one-column dataframe with a DatetimeIndex
    df = pd.DataFrame([
        {"timestamp": d.timestamp, "value": d.value}
        for d in data_responses
    ])
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.set_index("timestamp").sort_index()

    df = df.resample("h").mean().interpolate("time")
    return df


AVAILABLE_LOCATIONS = ["building-a"]

if __name__ == '__main__':
    predict_db: Session = SessionLocal()

    # delete entries
    predict_db.query(TempPredictedValue).delete()
    predict_db.query(HumidPredictedValue).delete()
    predict_db.query(PressPredictedValue).delete()
    predict_db.commit()

    for location in tqdm(AVAILABLE_LOCATIONS):
        print(f">>>Compute for: {location}")

        th_data, hh_data, ph_data = get_historical_data(location)

        # temperature
        if th_data:
            temperature_df = prepare_sensor_series(th_data)
            raw_predicted_temperature_values = run_prophet(
                temperature_df, th_data[0].timestamp.astimezone(ZoneInfo("Europe/Bucharest"))
            )
            predicted_temperature_values = [TempPredictedValue(value=val, location=location, timestamp=ts)
                                            for ts, val in raw_predicted_temperature_values]
            predict_db.add_all(predicted_temperature_values)
            predict_db.commit()

        # humidity
        if hh_data:
            humidity_df = prepare_sensor_series(hh_data)
            raw_predicted_humidity_values = run_prophet(
                humidity_df, hh_data[0].timestamp.astimezone(ZoneInfo("Europe/Bucharest"))
            )
            predicted_humidity_values = [HumidPredictedValue(value=val, location=location, timestamp=ts)
                                         for ts, val in raw_predicted_humidity_values]
            predict_db.add_all(predicted_humidity_values)
            predict_db.commit()

        # pressure
        if ph_data:
            pressure_df = prepare_sensor_series(ph_data)
            raw_predicted_pressure_values = run_sarima(
                pressure_df, ph_data[0].timestamp.astimezone(ZoneInfo("Europe/Bucharest"))
            )
            predicted_pressure_values = [PressPredictedValue(value=val, location=location, timestamp=ts)
                                         for ts, val in raw_predicted_pressure_values]
            predict_db.add_all(predicted_pressure_values)
            predict_db.commit()

    predict_db.close()
