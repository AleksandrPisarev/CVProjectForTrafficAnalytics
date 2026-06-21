from pydantic import BaseModel, EmailStr
from typing import Optional

# 1. Схема для первого шага (нажатие кнопки «Сохранить»)
class UserPatchRequest(BaseModel):
    name: Optional[str] = None
    surname: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

# 2. Схема для второго шага (ввод кода подтверждения)
class EmailConfirmRequest(BaseModel):
    new_email: EmailStr
    code: str