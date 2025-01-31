from datetime import datetime, date
from enum import Enum

from pydantic import BaseModel


class ReservationRequest(BaseModel):
    room_name: str
    start_date: datetime
    end_date: datetime
    name: str


class TimeInterval(Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class ReservationResponse(ReservationRequest):
    day: date
    created_at: datetime
