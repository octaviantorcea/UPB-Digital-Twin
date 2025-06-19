import os
from datetime import datetime
from zoneinfo import ZoneInfo

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from predict.database_model import SessionLocal, TempPredictedValue, HumidPredictedValue, PressPredictedValue
from shared_models.sensor_data_model import DataResponse

app = FastAPI()

load_dotenv()


SENSOR_TYPE_TO_UNIT = {
    "temperature": "°C",
    "humidity": "%",
    "pressure": "hPa"
}


def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/last_prediction")
async def get_last_prediction(
    location: str,
    sensor_type: str,
    from_date: datetime = None,
    db: Session = Depends(_get_db),
) -> list[DataResponse]:
    if sensor_type == "temperature":
        query_class = TempPredictedValue
    elif sensor_type == "humidity":
        query_class = HumidPredictedValue
    elif sensor_type == "pressure":
        query_class = PressPredictedValue
    else:
        raise HTTPException(404, "Unknown sensor type")

    if not from_date:
        cutoff_date = datetime.now(ZoneInfo("Europe/Bucharest"))
    else:
        cutoff_date = from_date

    query = db.query(query_class).filter_by(location=location).filter(query_class.timestamp > cutoff_date)

    predicted_data = []
    for res in query:
        predicted_data.append(DataResponse(
            id="",
            device_id="",
            sensor_type=sensor_type,
            value=res.value,
            unit=SENSOR_TYPE_TO_UNIT[sensor_type],
            timestamp=res.timestamp,
            location=location,
            latitude=0.0,
            longitude=0.0,
        ))

    return predicted_data

if __name__ == "__main__":
    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("PORT")))
