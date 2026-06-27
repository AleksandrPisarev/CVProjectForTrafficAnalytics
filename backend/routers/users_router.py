import random
from typing import Annotated
from fastapi import APIRouter, HTTPException, Request, status, Depends
from database.connection import get_session
from database.models import User
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from email.mime.text import MIMEText
import aiosmtplib
from schemas.users import UserPatchRequest, EmailConfirmRequest
from .auth_router import hash_password, TEMP_VERIFICATION_CODES

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


# ЭНДПОИНТ 1: НАЖАТИЕ КНОПКИ «СОХРАНИТЬ»
@router.patch("/{current_email}")
async def update_profile(
        current_email: str,
        payload: UserPatchRequest,
        session: Annotated[AsyncSession, Depends(get_session)],
        request: Request
):
    update_dict = payload.model_dump(exclude_unset=True)

    # Если меняется email
    if "email" in update_dict and update_dict["email"] != current_email:
        new_email = update_dict["email"]

        # 1. Проверяем уникальность почты
        query = select(User).where(User.email == new_email)
        result = await session.execute(query)
        if result.scalars().first():
            raise HTTPException(status_code=400, detail=f"Пользователь {new_email} уже зарегистрирован в системе")

        # 2. Отправляем письмо с 4-значным кодом
        code = str(random.randint(1000, 9999))
        email_cfg = request.app.state.config.email

        msg = MIMEText(f"Код подтверждения для изменения почты: {code}", "plain", "utf-8")
        msg["Subject"] = "TrafficAI: Код подтверждения смены email"
        msg["From"] = f"TrafficAI <{email_cfg.sender_email}>"
        msg["To"] = new_email

        await aiosmtplib.send(
            msg, hostname=email_cfg.smtp_server, port=email_cfg.smtp_port,
            username=email_cfg.sender_email, password=email_cfg.sender_password, start_tls=True
        )

        # 3. Сохраняем изменения и код в кэш строго после отправки письма
        update_dict["verification_code"] = code
        TEMP_VERIFICATION_CODES[new_email] = update_dict

        return {"success": True, "verification_required": True}

    # Если email НЕ меняется — обновляем базу данных сразу
    if "password" in update_dict:
        update_dict["password"] = hash_password(update_dict["password"])

    query = update(User).where(User.email == current_email).values(**update_dict).returning(User)
    result = await session.execute(query)
    user = result.scalars().first()
    await session.commit()

    return {
        "success": True,
        "user": {"name": user.name, "surname": user.surname, "email": user.email, "status": user.status}
    }


# ЭНДПОИНТ 2: ВВОД КОДА И ПЕРЕЗАПИСЬ ВСЕХ ДАННЫХ В БД
@router.post("/{current_email}/confirm-email")
async def confirm_email(
        current_email: str,
        session: Annotated[AsyncSession, Depends(get_session)],
        payload: EmailConfirmRequest
):
    new_email = payload.new_email

    # 1. Ищем данные в кэше
    if new_email not in TEMP_VERIFICATION_CODES:
        raise HTTPException(status_code=400, detail="Срок действия кода истек")

    cached_data = TEMP_VERIFICATION_CODES[new_email]

    # 2. Проверяем правильность кода
    if cached_data["verification_code"] != payload.code:
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")

    # Удаляем код из данных перед записью в БД
    del cached_data["verification_code"]

    # 3. Хэшируем пароль, если он менялся
    if "password" in cached_data:
        cached_data["password"] = hash_password(cached_data["password"])

    # 4. Пишем всё в PostgreSQL одной транзакцией
    query = update(User).where(User.email == current_email).values(**cached_data).returning(User)
    result = await session.execute(query)
    user = result.scalars().first()
    await session.commit()

    TEMP_VERIFICATION_CODES.pop(new_email, None)  # Чистим кэш

    return {
        "success": True,
        "user": {"name": user.name, "surname": user.surname, "email": user.email, "status": user.status}
    }


@router.delete("/{current_email}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
        current_email: str,
        session: Annotated[AsyncSession, Depends(get_session)],
        request: Request
):
    # 1. СНАЧАЛА ОСТАНАВЛИВАЕМ ВСЕ КАМЕРЫ НА СЕРВЕРЕ
    manager = request.app.state.manager
    try:
        # Вызываем менеджер для принудительной остановки всех потоков детекции
        manager.release_all()
    except Exception as e:
        # Если камеры не смогли остановиться, прерываем удаление и сообщаем об ошибке
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось остановить процессы камер перед удалением: {str(e)}"
        )

    # 2. ПОСЛЕ УСПЕШНОЙ ОСТАНОВКИ КАМЕР УДАЛЯЕМ ЗАПИСЬ ИЗ БД
    query = delete(User).where(User.email == current_email)
    result = await session.execute(query)

    await session.commit()
    return None  # При статусе 204 возвращаем пустой ответ