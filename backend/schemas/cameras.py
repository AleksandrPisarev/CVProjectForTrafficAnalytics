from pydantic import BaseModel

class ConnectRtspFormRequest(BaseModel):
    name: str
    brand: str
    ip: str
    username: str
    password: str
    rtsp_tail: str

class DisconnectCameraRequest(BaseModel):
    ip: str

class DemoCameraRequest(BaseModel):
    name: str
    ip: str