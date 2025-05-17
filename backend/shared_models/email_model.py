from pydantic import BaseModel, EmailStr


class EmailRequest(BaseModel):
    recipient: EmailStr
    subject: str
    message: str
