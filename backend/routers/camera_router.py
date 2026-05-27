from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from modules.camera_manager import camera_manager

router = APIRouter(prefix="/api/v1/cameras", tags=["cameras"])

# Эндпоинт поиска подсети
@router.get("/subnet")
async def subnet_diagnosis():
    subnet_range, free_ips = await camera_manager.get_network_diagnosis()

    return {
        "subnet_range": subnet_range,
        "free_ips": free_ips
    }

# СХЕМА ДАННЫХ (Pydantic модель для ввода RTSP)
class ConnectRtspFormRequest(BaseModel):
    name: str
    brand: str
    ip: str
    username: str
    password: str
    rtsp_tail: str

# Эндпоинт подключения камеры
@router.post("/connect")
async def connect_rtsp_camera(data: ConnectRtspFormRequest, request: Request):
    manager = request.app.state.manager
    payload = data.model_dump()

    result = await camera_manager.check_camera(payload)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])

    try:
        manager.create_session(result["url"], data.ip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "ok"}


class DisconnectCameraRequest(BaseModel):
    ip: str


@router.post("/disconnect")
async def disconnect_camera(data: DisconnectCameraRequest, request: Request):
    manager = request.app.state.manager

    # Проверяем, запущена ли вообще такая сессия
    if data.ip in manager.sessions:
        # Вызываем твою функцию закрытия сессии (например, close_session или stop_session)
        # Подставь сюда реальное имя метода из твоего Manager
        manager.stop_session(data.ip)
        return {"status": "ok"}

    raise HTTPException(status_code=404, detail="Сессия для данной камеры не найдена")