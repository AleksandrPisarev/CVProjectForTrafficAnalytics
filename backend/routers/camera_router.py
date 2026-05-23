from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from modules.camera_manager import camera_manager

router = APIRouter(prefix="/api/v1/cameras", tags=["cameras"])

# СХЕМА ДАННЫХ (Pydantic модель для ввода RTSP)
class ConnectRtspFormRequest(BaseModel):
    name: str
    brand: str
    ip: str
    username: str
    password: str
    rtsp_tail: str

# Эндпоинт поиска подсети
@router.get("/subnet")
async def subnet_diagnosis():
    subnet_range, free_ips = await camera_manager.get_network_diagnosis()

    return {
        "subnet_range": subnet_range,
        "free_ips": free_ips
    }

# Эндпоинт подключения камеры
@router.post("/connect")
async def connect_rtsp_camera(data: ConnectRtspFormRequest, request: Request):
    engine = request.app.state.engine
    payload = data.model_dump()

    result = await camera_manager.check_camera(payload)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])

    # Если видео запустилось, отдаем ссылку в ваш Object_container
    engine.start_capture(result["url"])

    # Фронтенду возвращаем просто подтверждение успеха
    return {"status": "ok"}