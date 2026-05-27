import hydra
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.session_manager import SessionManager
from contextlib import asynccontextmanager
from routers import camera_router, stream_router

'''освобождает ресурсы при остановки сервера'''
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ПРИ СТАРТЕ: Ничего не пишем, менеджер создается в main(config)
    yield
    # ПРИ ВЫКЛЮЧЕНИИ:
    if hasattr(app.state, 'manager'):
        print("Освобождение ресурсов всех камер...", flush=True)
        app.state.manager.release_all()

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


@hydra.main(version_base=None, config_path='configs', config_name='config')
def main(config):
    app.state.manager = SessionManager(config)
    # Запускаем сервер Uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == '__main__':
    main()