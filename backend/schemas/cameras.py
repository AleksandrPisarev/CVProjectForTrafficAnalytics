from pydantic import BaseModel, EmailStr
from typing import Optional

class CameraCreate(BaseModel):
    name: str
    ip: str
    email: Optional[EmailStr] = None
    port: int = 554 # Значение по умолчанию
    brand: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    rtsp_tail: Optional[str] = None

class DisconnectCameraRequest(BaseModel):
    ip: str