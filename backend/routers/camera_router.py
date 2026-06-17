from fastapi import APIRouter, Request, HTTPException
from schemas import cameras as sc
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

# Эндпоинт подключения камеры
@router.post("/connect")
async def connect_rtsp_camera(data: sc.ConnectRtspFormRequest, request: Request):
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

@router.post("/disconnect")
async def disconnect_camera(data: sc.DisconnectCameraRequest, request: Request):
    manager = request.app.state.manager

    # Проверяем, запущена ли вообще такая сессия
    if data.ip in manager.sessions:
        # Вызываем твою функцию закрытия сессии (например, close_session или stop_session)
        # Подставь сюда реальное имя метода из твоего Manager
        manager.stop_session(data.ip)
        return {"status": "ok"}

    raise HTTPException(status_code=404, detail="Сессия для данной камеры не найдена")

@router.post("/demo")
async def connect_demo_camera(data: sc.DemoCameraRequest, request: Request):
    manager = request.app.state.manager

    try:
        # 2. Логика автоподбора файла по кругу (1.mp4, 2.mp4, 3.mp4, 4.mp4)
        # Вытаскиваем цифру из ID (например, из "demo_1" достаем 1)
        number = int(data.ip.split("_")[1])

        # Находим остаток от деления на 2, чтобы файлы шли по очереди
        file_index = number % 2
        if file_index == 0:
            file_index = 2  # Если остаток 0 (для demo_2), то файл должен быть 2.mp4

        # 3. Собираем прямой путь к файлу (буква r перед строкой защищает слэши)
        file_path = f"{file_index}.mp4"

        # 4. Запускаем сессию!
        # Передаем путь к файлу вместо RTSP-ссылки и сгенерированный ID ("demo_X") в качестве IP
        manager.create_session(file_path, data.ip)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "ok"}

@router.post("/stop-all")
async def stop_all_cameras(request: Request):
    manager = request.app.state.manager
    try:
        # Вызываем менеджер сессий для принудительной остановки всех камер
        manager.release_all()
        return {"status": "success", "message": "All streams stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/toggle-ai")
async def toggle_camera_ai(data: sc.DisconnectCameraRequest, request: Request):
    try:
        # 1. Достаем менеджер сессий из глобального состояния приложения FastAPI
        manager = request.app.state.manager

        # 2. Ищем запущенную сессию камеры по ее IP
        session = manager.sessions.get(data.ip)
        if not session:
            # Эту ошибку мы кидаем через raise, и она уйдет клиенту как 404
            raise HTTPException(status_code=404, detail=f"Активная сессия для камеры {data.ip} не найдена")

        # 3. Инвертируем флаг. Наш Поток Детекции на следующем же кадре увидит изменения
        session.is_AI_active = not session.is_AI_active

        print(f"[FastAPI] Статус AI для камеры {data.ip} изменен на: {session.is_AI_active}")

        return {"status": "ok"}

    except HTTPException:
        # Если это наша ошибка 404, просто пробрасываем её дальше без изменений
        raise
    except Exception as e:
        # Ловим только непредвиденные критические сбои и превращаем в ошибку 500
        print(f"[FastAPI Error] Сбой в эндпоинте toggle-ai для камеры {data.ip}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при переключении режима ИИ: {str(e)}")