from pydantic import BaseModel
from typing import Dict, Optional

class ViolatorCreate(BaseModel):
    camera_id: str
    max_speed: float
    proof_image: str
    car_image: str
    plate_variants: Dict[str, Optional[str]] # Словарь, где ключ — текст номера, значение — Base64 строка или None