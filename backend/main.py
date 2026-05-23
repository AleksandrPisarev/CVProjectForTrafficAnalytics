import hydra
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.object_container import Object_container
from contextlib import asynccontextmanager
from routers import camera_router, stream_router

'''освобождает ресурсы при остановки сервера'''
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ПРИ СТАРТЕ: Здесь можно ничего не писать,
    # так как я создаю engine позже в main(config)
    yield
    # ПРИ ВЫКЛЮЧЕНИИ (нажал красный квадрат):
    if hasattr(app.state, 'engine'):
        print("освобождение ресурсов...", flush=True)
        app.state.engine.release()

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
    app.state.engine = Object_container(config)
    # Запускаем сервер Uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == '__main__':
    main()