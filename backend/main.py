import hydra
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from modules.object_container import Object_container
from contextlib import asynccontextmanager

'''освобождает ресурсы при остановки сервера'''
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ПРИ СТАРТЕ: Здесь можно ничего не писать,
    # так как я создаю engine позже в main(config)
    yield
    # ПРИ ВЫКЛЮЧЕНИИ (нажал красный квадрат):
    if hasattr(app.state, 'engine'):
        print("освобождение ресурсов...")
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

@app.get("/video_feed")
def video_feed(request: Request):
    # Достаем наш "объект" из состояния приложения
    engine = request.app.state.engine

    return StreamingResponse(engine.process_run(), media_type="multipart/x-mixed-replace; boundary=frame")

@hydra.main(version_base=None, config_path='configs', config_name='config')
def main(config):
    app.state.engine = Object_container(config)
    # Запускаем сервер Uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == '__main__':
    main()