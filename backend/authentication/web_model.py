from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CreateUserBody(BaseModel):
    username: str
    password: str
    email: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenModel(BaseModel):
    username_id: int
    username: str
    scope: str
    email: Optional[str] = None
    secret: Optional[str] = None
    tfa_enabled: Optional[bool] = None
    exp: Optional[datetime] = None
