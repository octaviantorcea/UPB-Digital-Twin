from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TokenModel(BaseModel):
    username_id: int
    username: str
    first_name: str
    last_name: str
    scope: str
    email: Optional[str] = None
    secret: Optional[str] = None
    tfa_enabled: Optional[bool] = None
    exp: Optional[datetime] = None
