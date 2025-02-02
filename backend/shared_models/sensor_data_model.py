from datetime import datetime

from pydantic import BaseModel


class DataResponse(BaseModel):
    id: str
    device_id: str
    sensor_type: str
    value: float
    timestamp: datetime
    location: str
