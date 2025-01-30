import os
from typing import Annotated

import pyotp
import uvicorn
from bcrypt import hashpw, gensalt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Security
from fastapi.security import HTTPBearer

from backend.authentication.database_model import User, SessionLocal
from backend.authentication.web_model import CreateUserBody
from backend.shared_models.scopes import Scopes
from backend.utils.auth import get_authorization
from backend.utils.encrypt import decrypt_str, encrypt_str

load_dotenv()
security = HTTPBearer()

app = FastAPI()


def _hash_password(password: str) -> str:
    return hashpw(password.encode("utf-8"), gensalt()).decode("utf-8")


def _check_unique_user(new_user: CreateUserBody, registered_users: list[User]) -> (bool, str):
    for registered_user in registered_users:
        if new_user.username == decrypt_str(registered_user.username):
            return False, "Username already exists"

        if new_user.email == decrypt_str(registered_user.email):
            return False, "Email already exists"

    return True, ''


@app.post("/register")
async def register_user(user: CreateUserBody):
    db = SessionLocal()

    is_unique, msg = _check_unique_user(user, db.query(User).all())

    if not is_unique:
        db.close()
        raise HTTPException(status_code=403, detail=msg)

    try:
        hashed_password = _hash_password(user.password)
        encrypted_username = encrypt_str(user.username)
        encrypted_email = encrypt_str(user.email)

        db_user = User(username=encrypted_username,
                       password=hashed_password,
                       email=encrypted_email,
                       secret=pyotp.random_base32())

        db.add(db_user)
        db.commit()

        # admin_token = create_access_token(
        #     data=TokenModel(
        #         username_id=-1,
        #         username="admin_for_email",
        #         scope=Scopes.ADMIN
        #     ).model_dump(),
        #     expires_delta=1,
        # )
        # headers = {
        #     "Authorization": f"Bearer {admin_token}",
        #     "Content-Type": "application/json",
        # }
        #
        # r = requests.post(
        #     os.getenv("BACKBONE_EMAIL_SERVICE_ADDRESS"),
        #     headers=headers,
        #     json=EmailRequest(
        #         recipient_email=user.email,
        #         subject="IMDB2 Confirmation Link",
        #         message=f"Hello, {user.username}! Click on this link to confirm your email and finish creating your "
        #                 f"IMDB2 account:\nhttp://localhost:29201/confirm/{encrypt_str(str(db_user.id))}"
        #     ).model_dump()
        # )
        #
        # if r.status_code != 200:
        #     logger.error(r.text)
        #     raise HTTPException(status_code=500, detail=r.json())

        db.refresh(db_user)

        # TODO: remove "link" field from return json when email service is implemented
        return {
            "message": "User registered successfully. To complete the registration, we need you to confirm your email. "
                       "Access the link sent to your email.",
            "link": f"http://localhost:29201/confirm/{encrypt_str(str(db_user.id))}"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/confirm/{encrypted_user_id}")
async def confirm_user(encrypted_user_id: str):
    db = SessionLocal()

    try:
        user_id = int(decrypt_str(encrypted_user_id))
        confirmed_user = db.query(User).filter_by(id=user_id).first()

        if not confirmed_user:
            raise HTTPException(status_code=404, detail="User not found")

        confirmed_user.confirmed = True

        db.commit()
        db.refresh(confirmed_user)

        return {"message": "User registration completed!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/users/{user_id}")
async def get_user(
        is_admin: Annotated[bool, Security(get_authorization, scopes=[Scopes.ADMIN])],
        user_id: int
):
    if not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden access")

    db = SessionLocal()

    try:
        db_user = db.query(User).filter(User.id == user_id).first()

        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        username = decrypt_str(db_user.username)
        email = decrypt_str(db_user.email)

        return {
            "id": db_user.id,
            "username": username,
            "email": email,
            "confirmed": db_user.confirmed,
            "scope": db_user.scope,
            "2fa_enabled": db_user.tfa_enabled,
            "secret": db_user.secret,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/users")
async def get_all_registered_users(
    is_admin: Annotated[bool, Security(get_authorization, scopes=[Scopes.ADMIN])],
):
    if not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden access")

    db = SessionLocal()

    try:
        users = db.query(User).all()
        return [
            {
                "id": user.id,
                "username": decrypt_str(user.username),
                "email": decrypt_str(user.email),
                "confirmed": user.confirmed,
                "scope": user.scope,
                "2fa_enabled": user.tfa_enabled,
                "secret": user.secret
            }
            for user in users
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.post("/remove_user")
async def remove_user(
    user_id: int,
    is_admin: Annotated[bool, Security(get_authorization, scopes=[Scopes.ADMIN])]
):
    if not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden access")

    db = SessionLocal()

    User.query.filter(User.id == user_id).delete()
    db.commit()

    db.close()


if __name__ == "__main__":
    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("REGISTRATION_PORT")))
