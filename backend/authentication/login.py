import os
from datetime import datetime, timezone, timedelta
from typing import Annotated

import bcrypt
import jwt
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm, HTTPAuthorizationCredentials, HTTPBearer

from backend.authentication.database_model import User, get_all_registered_users_as_list
from backend.authentication.web_model import Token
from backend.shared_models.scopes import Scopes
from backend.shared_models.token import TokenModel
from backend.utils.encrypt import decrypt_str

BASE_EXPIRE_DELTA = 120


load_dotenv()
security = HTTPBearer()

app = FastAPI()


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: int = BASE_EXPIRE_DELTA) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": datetime.now(timezone.utc) + timedelta(minutes=expires_delta)})
    return jwt.encode(to_encode, key=os.getenv("JWT_SECRET_KEY"), algorithm=os.getenv("JWT_ALGORITHM"))


def _authenticate_user(username: str, password: str, registered_users: list[User]) -> User | None:
    for user in registered_users:
        if user.confirmed and username == decrypt_str(user.username) and verify_password(password, user.password):
            return user

    return None


def decode_access_token(token: str) -> TokenModel:
    try:
        return TokenModel.model_validate(jwt.decode(token,
                                                    key=os.getenv("JWT_SECRET_KEY"),
                                                    algorithms=os.getenv("JWT_ALGORITHM")))
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")


@app.post("/login", response_model=Token)
def login(
        credentials: Annotated[OAuth2PasswordRequestForm, Depends()],
        registered_users: Annotated[list[User], Depends(get_all_registered_users_as_list)],
) -> Token:

    user = _authenticate_user(credentials.username, credentials.password, registered_users)

    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    return Token(
        access_token=create_access_token(
            TokenModel(
                username_id=user.id,
                username=credentials.username,
                first_name=decrypt_str(user.first_name),
                last_name=decrypt_str(user.last_name),
                scope=user.scope,
                email=decrypt_str(user.email),
                secret=user.secret,
                tfa_enabled=user.tfa_enabled
            ).model_dump()
        ),
        token_type="bearer",
    )


@app.get("/get_current_user", response_model=TokenModel)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenModel:
    return decode_access_token(credentials.credentials)


@app.get("/authorize", response_model=bool)
def authorize_user(
    scope: Scopes,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    decoded_token = decode_access_token(credentials.credentials)
    return int(scope) <= int(decoded_token.scope)


if __name__ == "__main__":
    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("LOGIN_PORT")))
