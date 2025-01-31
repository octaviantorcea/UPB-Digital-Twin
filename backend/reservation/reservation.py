import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.security import HTTPBearer

load_dotenv()
security = HTTPBearer()

app = FastAPI()


if __name__ == '__main__':
    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("PORT")))
