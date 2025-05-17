import os
import smtplib
from email.mime.text import MIMEText

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

from shared_models.email_model import EmailRequest

load_dotenv()

app = FastAPI()


# Load credentials
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")


@app.post("/send_email")
async def send_email(data: EmailRequest):
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        raise HTTPException(status_code=500, detail="Email server not configured")

    try:
        msg = MIMEText(data.message)
        msg["Subject"] = data.subject
        msg["From"] = SENDER_EMAIL
        msg["To"] = data.recipient

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)

        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("PORT")))
