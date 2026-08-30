from pydantic import BaseModel, Field

# Базовая модель — есть у всех запросов
class CameraBaseRequest(BaseModel):
    ip: str

# Модель для СТОП (ей достаточно только IP)
class StopCalibrationRequest(CameraBaseRequest):
    pass  # Просто наследует поле ip

# Модели, где нужно число, наследуют 'ip' и добавляют свои валидации:
class StartCalibrationRequest(CameraBaseRequest):
    calibration_speed: int = Field(..., gt=0)

class SendCarIdRequest(CameraBaseRequest):
    car_id: int = Field(..., ge=0)

class SaveMaxSpeedRequest(CameraBaseRequest):
    max_speed: int = Field(..., gt=0)