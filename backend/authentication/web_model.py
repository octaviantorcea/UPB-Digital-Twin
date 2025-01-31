from pydantic import BaseModel


class CreateUserBody(BaseModel):
    first_name: str
    last_name: str
    username: str
    password: str
    email: str


class Token(BaseModel):
    access_token: str
    token_type: str
