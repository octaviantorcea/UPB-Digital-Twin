import os
import random
from typing import Dict, List, Tuple

import httpx
import redis
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request, BackgroundTasks

from backend.shared_models.sensor_data_model import DataResponse, HistDataRequest, RealTimeDataRequest

app = FastAPI()

load_dotenv()

redis_client = redis.Redis(host=os.getenv('REDIS_HOST'),
                           port=os.getenv('REDIS_PORT'),
                           decode_responses=True)

KEY_DELIM = "|"


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
        return [DataResponse.model_validate(res) for res in response.json()] if response.json() else []


@app.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    background_tasks.add_task(update_real_time_data, data)
    return {"status": "received"}


def update_real_time_data(data: List[Dict]):
    for entry in data:
        try:
            new_entry = DataResponse.model_validate(entry)
        except Exception as e:
            print(str(e))
            continue

        key = KEY_DELIM.join((new_entry.device_id, new_entry.sensor_type, new_entry.location))

        redis_client.set(key, new_entry.model_dump_json())


@app.get("/real_time_data")
async def get_real_time_data(
    real_time_req: RealTimeDataRequest = Depends()
) -> Dict[Tuple[str, str, str], DataResponse]:
    filtered_data = {}

    keys = redis_client.keys("*")
    for key in keys:
        key_parts = key.split(KEY_DELIM)

        if (real_time_req.device_id is None or real_time_req.device_id == key_parts[0]) \
            and (real_time_req.sensor_type is None or real_time_req.sensor_type == key_parts[1]) \
                and (real_time_req.location is None or real_time_req.location == key_parts[2]):
            data = eval(redis_client.get(key))
            filtered_data[(key_parts[0], key_parts[1], key_parts[2])] = DataResponse.model_validate(data)

    return filtered_data


@app.get("/get_building_plan")
async def get_building_plan() -> Dict[str, set[str]]:
    FLOORS = ["Floor1", "Floor2", "Floor3"]

    latest_data = await get_real_time_data(RealTimeDataRequest())

    building_plan = {}

    for (device, sensor_type, location) in latest_data:
        floor = random.choice(FLOORS)

        if floor not in building_plan:
            building_plan[floor] = set()

        building_plan[floor].add(location)

    return building_plan


if __name__ == "__main__":
    # subscribe
    with httpx.Client() as sub_client:
        r = sub_client.post(
            os.getenv("WEBHOOK_SUB"),
            json={
                "url": f"http://host.docker.internal:{os.getenv("PORT")}/webhook",
                "topic_filter": "#",
                "secret": "your-secret-key"
            },
        )

    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("PORT")))
