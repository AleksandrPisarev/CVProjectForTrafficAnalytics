from pydantic import BaseModel, EmailStr, Field

class EmailCheckRequest(BaseModel):
    email: EmailStr

class UserRegisterConfirm(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    surname: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=3) # Минимальная длина пароля
    user_code: str = Field(..., min_length=4, max_length=4) # 4-значный код

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=3)

class ResetPasswordConfirmRequest(BaseModel):
    email: EmailStr
    user_code: str = Field(..., min_length=4, max_length=4)