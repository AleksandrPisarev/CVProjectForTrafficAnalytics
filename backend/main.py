import hydra
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.session_manager import SessionManager
from contextlib import asynccontextmanager
from routers import camera_router, stream_router, auth_router, users_router
from database import connection
from database.models import Base


'''создает таблицы при запуске сервера и освобождает ресурсы при остановки сервера'''
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- ЭТАП 1: ЗАПУСК СЕРВЕРА ---
    print("Инициализация базы данных...", flush=True)
    db_url = app.state.config.database.db_url

    # Подключаемся к БД
    connection.init_db(db_url)

    # Проверяем/создаем таблицы на старте
    async with connection.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("База данных успешно синхронизирована!", flush=True)

    # Передаем управление FastAPI (сервер начинает работать)
    yield

    # --- ЭТАП 2: ОСТАНОВКА СЕРВЕРА  ---
    if hasattr(app.state, 'manager'):
        print("Освобождение ресурсов всех камер...", flush=True)
        app.state.manager.release_all()

    # Закрываем пулы соединений базы данных
    if connection.engine:
        await connection.engine.dispose()


app = FastAPI(lifespan=lifespan)

# РАЗРЕШАЕМ REACT (порт 5173) КАСАТЬСЯ БЭКЕНДА
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(camera_router.router)
app.include_router(stream_router.router)
app.include_router(auth_router.router)
app.include_router(users_router.router)


@hydra.main(version_base=None, config_path='configs', config_name='config')
def main(config):
    app.state.config = config
    app.state.manager = SessionManager(config)
    # Запускаем сервер Uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == '__main__':
    main()