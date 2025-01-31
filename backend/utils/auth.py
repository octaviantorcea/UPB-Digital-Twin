import os

import requests
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import SecurityScopes, HTTPAuthorizationCredentials, HTTPBearer

from backend.shared_models.scopes import Scopes
from backend.shared_models.token import TokenModel

security = HTTPBearer()
load_dotenv()


def get_authorization(
    security_scopes: SecurityScopes,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> bool:

    try:
        security_scope = Scopes(security_scopes.scope_str)
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid scopes")

    try:
        r = requests.get(
            os.getenv("AUTH_ADDRESS"),
            params={"scope": security_scope},
            headers={
                "Authorization": f"Bearer {credentials.credentials}",
                "Content-Type": "application/json"
            }
        )

        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=r.text)

        return r.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenModel:

    try:
        r = requests.get(
            os.getenv("CURR_USER_ADDRESS"),
            headers={
                "Authorization": f"Bearer {credentials.credentials}",
                "Content-Type": "application/json"
            }
        )

        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=r.text)

        return TokenModel.model_validate(r.json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
