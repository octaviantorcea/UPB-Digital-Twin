import io
import os

import httpx
import pandas as pd
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from backend.shared_models.sensor_data_model import HistDataRequest
from backend.historical_data.web_models import SensorType, DataFormat, AggrPeriod, AggregationMethod

load_dotenv()

app = FastAPI()


async def _get_data(
    hist_data_request: HistDataRequest
):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            os.getenv("DATA_URL"),
            params=hist_data_request.model_dump(exclude_none=True, exclude_unset=True, by_alias=True)
        )
        response.raise_for_status()

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch data")

    return response.json()


@app.get("/historical_report")
async def generate_report(
    sensor: SensorType,
    location: str,
    period: AggrPeriod = AggrPeriod.DAILY,
    aggregation_method: AggregationMethod = AggregationMethod.MEAN,
    from_date: str = Query(None, description="RFC3339 format only (example: 2024-01-18T23:59:59Z"),
    to_date: str = Query(None, description="RFC3339 format only (example: 2024-01-18T23:59:59Z"),
    data_format: DataFormat = Query(DataFormat.JSON, description="Export format: json, csv"),
):
    data = await _get_data(HistDataRequest(
        sensor_type=sensor,
        location=location,
        # from=from_date,
        to=to_date
    ))

    df = pd.DataFrame(data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df.set_index('timestamp', inplace=True)

    df['value'] = pd.to_numeric(df['value'], errors='coerce')
    df.dropna(subset=['value'], inplace=True)

    if period == "daily":
        report = df['value'].resample('D')
    elif period == "weekly":
        report = df['value'].resample('W')
    elif period == "seasonal":
        report = df['value'].resample('Q')
    else:
        raise HTTPException(status_code=400, detail="Invalid period specified")

    if aggregation_method == AggregationMethod.MEAN:
        report = report.mean().reset_index()
    elif aggregation_method == AggregationMethod.MIN:
        report = report.min().reset_index()
    elif aggregation_method == AggregationMethod.MAX:
        report = report.max().reset_index()
    elif aggregation_method == AggregationMethod.MEDIAN:
        report = report.median().reset_index()
    elif aggregation_method == AggregationMethod.STD:
        report = report.std().reset_index()
    elif aggregation_method == AggregationMethod.COUNT:
        report = report.count().reset_index()
    elif aggregation_method == AggregationMethod.ROLLING_MEAN:
        report = report.mean().rolling(window=3, min_periods=1).mean().reset_index()
    else:
        raise HTTPException(status_code=400, detail="Invalid aggregation method")

    report = report.applymap(lambda x: 0 if pd.isna(x) else x)

    if data_format == DataFormat.JSON:
        return report.to_dict(orient='records')
    elif data_format == DataFormat.CSV:
        stream = io.StringIO()
        report.to_csv(stream, index=False)
        response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=historical_data.csv"
        return response
    else:
        raise HTTPException(status_code=400, detail="Invalid data format specified")


@app.get("/export_raw")
async def export(
    hist_data_request: HistDataRequest = Depends(),
    data_format: str = Query(default=DataFormat.CSV, description="Export format: json, csv"),
):
    data = await _get_data(hist_data_request)

    if data_format == DataFormat.CSV:
        df = pd.DataFrame(data)
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=historical_data.csv"
        return response
    elif data_format == DataFormat.JSON:
        return data
    else:
        raise HTTPException(status_code=400, detail="Invalid data format")


if __name__ == "__main__":
    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("PORT")))
