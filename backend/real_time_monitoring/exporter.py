import os

import redis
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Response
from prometheus_client import Gauge, generate_latest, CONTENT_TYPE_LATEST

from backend.shared_models.sensor_data_model import DataResponse

app = FastAPI()

load_dotenv()

redis_client = redis.Redis(host=os.getenv('REDIS_HOST'),
                           port=os.getenv('REDIS_PORT'),
                           decode_responses=True)

temperature_gauge = Gauge('sensor_temperature', 'Real-time temperature data', ['location', 'device_id'])
humidity_gauge = Gauge('sensor_humidity', 'Real-time humidity data', ['location', 'device_id'])
pressure_gauge = Gauge('sensor_pressure', 'Real-time pressure data', ['location', 'device_id'])


def update_metrics():
    keys = redis_client.keys("*")

    for key in keys:
        data = DataResponse.model_validate(eval(redis_client.get(key)))
        device_id = data.device_id
        sensor_type = data.sensor_type
        value = data.value
        location = data.location

        if sensor_type == "temperature":
            temperature_gauge.labels(location=location, device_id=device_id).set(value)
        if sensor_type == "humidity":
            humidity_gauge.labels(location=location, device_id=device_id).set(value)
        if sensor_type == "pressure":
            pressure_gauge.labels(location=location, device_id=device_id).set(value)


@app.get("/metrics")
def metrics():
    update_metrics()
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == '__main__':
    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("PORT")))
