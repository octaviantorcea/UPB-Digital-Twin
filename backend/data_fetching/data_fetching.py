import os
from typing import Dict, List, Tuple

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request, BackgroundTasks

from backend.data_fetching.web_model import HistDataRequest, DataResponse, RealTimeDataRequest

app = FastAPI()

load_dotenv()

latest_sensor_data: Dict[Tuple[str, str, str], DataResponse] = {}


@app.get("/historical_data")
async def get_historical_data(
    hist_data_req: HistDataRequest = Depends()
) -> List[DataResponse]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            os.getenv("HIST_SENSOR_DATA"),
            params=hist_data_req.model_dump(exclude_none=True, exclude_unset=True, by_alias=True)
        )
        response.raise_for_status()
        return [DataResponse.model_validate(res) for res in response.json()]


@app.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    background_tasks.add_task(update_real_time_data, data)
    return {"status": "received"}


def update_real_time_data(data: List[Dict]):
    for entry in data:
        new_entry = DataResponse.model_validate(entry)
        key = (new_entry.device_id, new_entry.sensor_type, new_entry.location)

        latest_sensor_data[key] = new_entry


@app.get("/real_time_data")
async def get_real_time_data(
    real_time_req: RealTimeDataRequest = Depends()
) -> Dict[Tuple[str, str, str], DataResponse]:
    return {
        key: value
        for key, value in latest_sensor_data.items()
        if (real_time_req.device_id is None or key[0] == real_time_req.device_id)
        and (real_time_req.sensor_type is None or key[1] == real_time_req.sensor_type)
        and (real_time_req.location is None or key[2] == real_time_req.location)
    }


if __name__ == "__main__":
    # subscribe
    with httpx.Client() as sub_client:
        r = sub_client.post(
            os.getenv("WEBHOOK_SUB"),
            json={
                "url": f"http://host.docker.internal:{os.getenv("PORT")}/webhook",
                "topic_filter": "PLACEHOLDER",
                "secret": "PLACEHOLDER"
            },
        )

    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("PORT")))
