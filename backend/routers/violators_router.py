from fastapi import APIRouter, Depends, status, HTTPException, WebSocket, WebSocketDisconnect
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.connection import get_session
from schemas import violators
from database.models import Violator

router = APIRouter(prefix="/api/violators", tags=["Violators"])

# 1. Менеджер подключений для вкладок браузера
class ConnectionManager:
    def __init__(self):
        # Создаем пустой список в оперативной памяти сервера.
        # Сюда будем складывать активные (сокеты) открытых вкладок браузера
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Вызывается, когда пользователь открывает страницу в браузере."""
        # Говорим браузеру: "Запрос принят, связь установлена"
        await websocket.accept()
        # Записываем эту вкладку в список активных соединений
        self.active_connections.append(websocket)
        print(f"[WS INFO] Вкладка React подключилась. Всего окон открыто: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Вызывается автоматически, когда пользователь закрывает вкладку или жмет F5."""
        # Убираем закрывшийся сокет из списка, чтобы сервер больше не пытался слать туда данные
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WS INFO] Вкладка React закрыта. Осталось окон: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Функция 'Громкая связь'. Рассылает данные во ВСЕ открытые вкладки."""
        # Запускаем цикл и перебираем по очереди каждую живую вкладку из списка
        for connection in self.active_connections:
            try:
                # Встроенный в FastAPI метод send_json берет Python-словарь,
                # сам превращает его в строку JSON и шлет по сетевому проводу в React
                await connection.send_json(message)
            except Exception as e:
                # Если отправить не удалось (например, вкладка зависла), логируем ошибку
                print(f"[WS ERROR] Не удалось отправить пакет в одну из вкладок: {e}")

manager = ConnectionManager()

# Эндпоинт веб-сокета (сюда React звонит при старте страницы)
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Этот эндпоинт не принимает обычные HTTP запросы. Он ждет сокет-соединение.
    Сюда React постучится через new WebSocket('ws://...')
    """
    # Добавляем эту вкладку в нашу записную книжку менеджера
    await manager.connect(websocket)
    try:
        while True:
            # Бесконечный цикл удерживает эту сетевую трубу открытой.
            # Ждем сообщений от фронтенда (хотя фронтенд нам ничего слать не будет,
            # этот вызов нужен просто чтобы сокет не закрывался сервером самовольно).
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Если пользователь закрыл вкладку, FastAPI выбросит это исключение,
        # и мы аккуратно удалим сокет из списка через менеджер
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS CRASH] Ошибка в сокет-соединении: {e}")
        manager.disconnect(websocket)

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=violators.ViolatorCreate
)
async def create_violator(
        payload: violators.ViolatorCreate,
        session: Annotated[AsyncSession, Depends(get_session)]
):
    """
    Асинхронно принимает JSON пакет от LPRManager, записывает в общую таблицу PostgreSQL
    и возвращает статус 201 Created.
    """
    try:
        new_violator = Violator(
            camera_id=payload.camera_id,
            max_speed=payload.max_speed,
            proof_image=payload.proof_image,
            car_image=payload.car_image,
            plate_variants=payload.plate_variants
        )

        session.add(new_violator)
        await session.commit()
        await session.refresh(new_violator)
        print(f"[FASTAPI SUCCESS] Нарушение с камеры {payload.camera_id} записано в БД!")

        # Действие на фронтенде: упаковываем данные из базы в JSON-словарь
        violator_json = {
            "id": new_violator.id,
            "camera_id": new_violator.camera_id,
            "max_speed": new_violator.max_speed,
            "proof_image": new_violator.proof_image,
            "car_image": new_violator.car_image,
            "plate_variants": new_violator.plate_variants
        }

        # Вызываем 'Громкую связь' и веером рассылаем пакет во все открытые вкладки браузера
        await manager.broadcast(violator_json)
        print(f"[FASTAPI SUCCESS] Нарушение транслировано на фронтенд по WebSockets!")

        return new_violator

    except Exception as e:
        await session.rollback()
        print(f"[FASTAPI ERROR] Ошибка записи в PostgreSQL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при сохранении в базу данных"
        )


@router.get(
    "",
    status_code=status.HTTP_200_OK
)
async def get_all_violators(
        session: Annotated[AsyncSession, Depends(get_session)]
):
    """
    Фронтенд запрашивает этот эндпоинт при загрузке страницы через fetch('/api/violators').
    Возвращает список всех нарушителей из базы данных.
    """
    try:
        # Асинхронный SQL-запрос: SELECT * FROM violators ORDER BY id DESC;
        # Сортируем по убыванию ID, чтобы самые свежие нарушения были вверху таблицы
        query = select(Violator).order_by(Violator.id.desc())
        result = await session.execute(query)
        violators = result.scalars().all()

        return violators
    except Exception as e:
        print(f"[FASTAPI ERROR] Не удалось прочитать таблицу violators: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при чтении данных из базы"
        )


@router.delete(
    "/{violator_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_violator(
        violator_id: int,
        session: Annotated[AsyncSession, Depends(get_session)]
):
    """
    Вызывается при нажатии кнопки «Удалить» на фронтенде.
    Навсегда стирает запись из PostgreSQL по её уникальному id.
    """
    try:
        # Ищем запись в базе данных
        query = select(Violator).where(Violator.id == violator_id)
        result = await session.execute(query)
        violator = result.scalar_one_or_none()

        if violator is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Нарушитель с id {violator_id} не найден"
            )

        # Удаляем объект из сессии и фиксируем в базе
        await session.delete(violator)
        await session.commit()

        print(f"[FASTAPI SUCCESS] Запись с id {violator_id} успешно удалена из PostgreSQL!")
        # Статус 204 No Content по стандарту HTTP ничего не возвращает в теле ответа, только статус успеха
        return None

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        print(f"[FASTAPI ERROR] Ошибка при удалении записи id {violator_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при удалении записи из базы данных"
        )