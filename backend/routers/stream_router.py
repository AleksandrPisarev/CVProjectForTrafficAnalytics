from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from fastapi import HTTPException

router = APIRouter(tags=["Stream"])

@router.get("/video_feed")
def video_feed(id: str, request: Request):
    # 1. Забираем менеджер сессий из состояния приложения
    manager = request.app.state.manager

    # 2. Проверяем, запущена ли камера с таким IP-адресом (ID)
    if id not in manager.sessions:
        raise HTTPException(
            status_code=404,
            detail=f"Сессия для камеры с ID {id} не найдена. Возможно, она не была подключена."
        )

    # 3. Достаем объект нужной сессии из словаря менеджера
    camera_session = manager.sessions[id]

    # 4. Отдаем в StreamingResponse её собственный бесконечный цикл с yield
    return StreamingResponse(
        camera_session.get_video_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/api/stats")
def get_stats(request: Request):
    # 1. Забираем менеджер сессий
    manager = request.app.state.manager

    # 2. Собираем общий словарь с метриками всех работающих камер
    all_camera_stats = {}
    for camera_id, camera_session in manager.sessions.items():
        # Записываем словарь live_stats (где лежит "fps") под ключом IP камеры
        all_camera_stats[camera_id] = camera_session.live_stats

    # 3. Возвращаем фронтенду большой словарь со всеми данными
    return all_camera_stats