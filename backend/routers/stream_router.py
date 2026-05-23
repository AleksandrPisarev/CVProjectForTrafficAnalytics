from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter(tags=["Stream"])

@router.get("/video_feed")
def video_feed(request: Request):
    # Достаем наш "объект" из состояния приложения
    # request.app — это доступ к основному приложению из роутера
    engine = request.app.state.engine
    return StreamingResponse(
        engine.process_run(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/api/stats")
def get_stats(request: Request):
    engine = request.app.state.engine
    return engine.live_stats