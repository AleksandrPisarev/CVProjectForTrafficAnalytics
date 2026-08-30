from fastapi import APIRouter, Request, HTTPException, status
from schemas import calibration as calib

router = APIRouter(prefix="/api/calibration", tags=["Calibration"])

# Вспомогательная функция поиска сессии камеры
def get_camera_session(request: Request, ip: str):
    manager = request.app.state.manager
    # Ищем камеру в словаре сессий по ключу (IP или ID)
    camera_session = manager.sessions.get(ip)
    if not camera_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Сессия для камеры {ip} не найдена"
        )
    return camera_session


# Запуск сбора данных для калибровки
@router.post("/start")
async def start_calibration(data: calib.StartCalibrationRequest, request: Request):
    # Находим нужную сессию камеры по IP
    camera_session = get_camera_session(request, data.ip)

    # Сохраняем эталонную скорость в поле класса камеры
    camera_session.speed_analytics.calibration_speed = data.calibration_speed

    # Переключаем флаги стейт-машины для этой камеры
    camera_session.speed_analytics.On_Off_data_Cy = True  # Сигнализируем фоновому потоку, что нужно собирать точки
    camera_session.speed_analytics.waiting_for_id = False  # Сбрасываем ожидание ID на случай, если это повторная калибровка

    # Возвращаем успешный ответ фронтенду
    return {
        "success": True,
        "message": f"Сбор данных запущен для камеры {data.ip} со скоростью {data.calibration_speed} км/ч"
    }


# Остановка сбора данных для калибровки
@router.post("/stop")
async def stop_calibration(data: calib.StopCalibrationRequest, request: Request):
    # Находим нужную сессию камеры по IP
    camera_session = get_camera_session(request, data.ip)

    # Меняем флаги стейт-машины внутри вашего сложного объекта аналитики
    camera_session.speed_analytics.waiting_for_id = True  # Включаем режим ожидания ID автомобиля
    camera_session.speed_analytics.On_Off_data_Cy = False  # Останавливаем сбор точек

    # Возвращаем HTTP-ответ с правильным ключом success
    return {
        "success": True,
        "message": f"Сбор данных для камеры {data.ip} успешно остановлен. Ожидание ID."
    }

# Отправка ID авто
@router.post("/car-id")
async def send_car_id(data: calib.SendCarIdRequest, request: Request):
    camera_session = get_camera_session(request, data.ip)

    try:
        success = camera_session.speed_analytics._build_y_pixel_map(car_id=data.car_id)
    except Exception as e:
        # Сервер возвращает плохой статус (!response.ok) и текст системной ошибки
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Критический сбой при расчете: {str(e)}"
        )

    # Функция отработала без ошибок, но вернула False
    # (То есть логика выполнилась, но точек реально не нашлось или не верный ID авто)
    if not success:
        # Возвращаем обычный успешный HTTP-ответ (response.ok будет True),
        # но внутри JSON передаем success: False
        return {
            "success": False,
            "message": f"Данные по ID {data.car_id} не найдены или точек слишком мало!"
        }

    # Функция вернула True
    camera_session.speed_analytics.waiting_for_id = False
    camera_session.speed_analytics.is_calibrated = True

    return {
        "success": True,
        "message": f"Карта пикселей для ID {data.car_id} успешно построена."
    }


# Сохранение максимальной разрешенной скорости
@router.post("/max-speed")
async def save_max_speed(data: calib.SaveMaxSpeedRequest, request: Request):
    # 1. Находим сессию камеры по её IP
    camera_session = get_camera_session(request, data.ip)

    # 2. Записываем лимит скорости в поле вашего аналитического объекта
    # Теперь система контроля будет знать, выше какой скорости фиксировать нарушения
    try:
        camera_session.speed_analytics.speed_limit = data.max_speed
    except Exception as e:
        # На случай, если возникла какая-то непредвиденная ошибка при записи в объект
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось сохранить скорость в конфигурацию камеры: {str(e)}"
        )

    # 3. Возвращаем успешный ответ для фронтенда с правильным ключом success
    return {
        "success": True,
        "message": f"Максимально разрешенная скорость {data.max_speed} км/ч успешно сохранена для камеры {data.ip}."
    }