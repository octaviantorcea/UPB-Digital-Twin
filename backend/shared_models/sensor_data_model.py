from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RealTimeDataRequest(BaseModel):
    device_id: Optional[str] = None
    sensor_type: Optional[str] = None
    location: Optional[str] = None


class HistDataRequest(RealTimeDataRequest):
    from_date: Optional[str] = Field(default=None, alias='from',
                                     description="RFC3339 format only (example: 2024-01-18T23:59:59Z)")
    to_date: Optional[str] = Field(default=None, alias='to',
                                   description="RFC3339 format only (example: 2024-01-18T23:59:59Z)")


class DataResponse(BaseModel):
    id: str
    device_id: str
    sensor_type: str
    value: float
    unit: str
    timestamp: datetime
    location: str
    latitude: float
    longitude: float
    is_indoor: bool
