from datetime import datetime, date
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class ReservationRequest(BaseModel):
    room_name: str
    start_date: datetime
    end_date: datetime
    name: Optional[str] = None


class TimeInterval(Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class ReservationResponse(ReservationRequest):
    day: date
    created_at: datetime
