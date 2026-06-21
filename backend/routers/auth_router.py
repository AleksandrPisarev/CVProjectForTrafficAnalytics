import random
from cachetools import TTLCache
import string
import secrets
import bcrypt
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select
from database import connection
from database.models import User, Camera
from schemas import auth as s_a

# Импортируем инструменты для создания писем и асинхронного SMTP
from email.mime.text import MIMEText
import aiosmtplib

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Временный словарь (кэш) на сервере для хранения кодов подтверждения.
# Ключ — email пользователя, значение — сгенерированная строка кода.
TEMP_VERIFICATION_CODES = TTLCache(maxsize=10000, ttl=300)

# --- Вспомогательная функция для хэширования пароля ---
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    # Хэшируем и возвращаем строку
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Метод сверяет введенный текст с хэшем из базы данных
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

@router.post("/registration-check")
async def registration_check(payload: s_a.EmailCheckRequest, request: Request):
    async with connection.async_session_maker() as session:
        # 1. Проверяем, есть ли уже такой email в PostgreSQL
        query = select(User).where(User.email == payload.email)
        result = await session.execute(query)
        existing_user = result.scalars().first()

        if existing_user:
            raise HTTPException(status_code=400, detail="user_exists")

        # 2. Почта свободна — генерируем 4-значный код и сохраняем его в память бэкенда
        code = str(random.randint(1000, 9999))

        # 3. ФОРМИРУЕМ И ОТПРАВЛЯЕМ РЕАЛЬНОЕ ПИСЬМО С КРАСИВЫМ ИМЕНЕМ
        try:
            # Забираем настройки почты из Hydra-конфига (из app.state)
            email_cfg = request.app.state.config.email

            # Создаем тело письма
            msg = MIMEText(f"Код подтверждения для регистрации в системе TrafficAI: {code}", "plain", "utf-8")
            msg["Subject"] = "TrafficAI: Код подтверждения регистрации"

            # Маскируем почту: пишем красивое имя, а в треугольных скобках Gmail
            msg["From"] = f"TrafficAI <{email_cfg.sender_email}>"
            msg["To"] = payload.email

            # Подключаемся асинхронно к Gmail и отправляем письмо
            await aiosmtplib.send(
                msg,
                hostname=email_cfg.smtp_server,
                port=email_cfg.smtp_port,
                username=email_cfg.sender_email,
                password=email_cfg.sender_password,
                start_tls=True  # TLS/SSL шифрование обязательно для Google порта 465
            )

        except Exception as e:
            # Если неверный пароль в конфиге или лег интернет — бэкенд не упадет,
            # а выведет ошибку в консоль и вернет красивый ответ на фронтенд
            print(f"\n[КРИТИЧЕСКАЯ ОШИБКА ПОЧТЫ]: {str(e)}\n", flush=True)
            raise HTTPException(status_code=500, detail="email_send_failed")

        TEMP_VERIFICATION_CODES[payload.email] = code
        return {"success": True, "detail": "Код отправлен"}


@router.post("/register-confirm")
async def register_confirm(payload: s_a.UserRegisterConfirm):
    # 1. Заглядываем в кэш и ищем код, который генерировали для этой почты
    saved_code = TEMP_VERIFICATION_CODES.get(payload.email)

    # 2. Если кода в памяти нет или пользователь ввел неправильные цифры
    if not saved_code or saved_code != payload.user_code:
        # Выдаем маркер ошибки, который  Zustand переведет как "Неверный код"
        raise HTTPException(status_code=400, detail="invalid_code")

    # 3. Код совпал! Очищаем память сервера от этого временного кода
    TEMP_VERIFICATION_CODES.pop(payload.email, None)

    # 4. Защищаем пароль: превращаем чистый текст "12345" в хэш-строку
    hashed_pwd = hash_password(payload.password)

    # 5. Открываем сессию для работы с PostgreSQL через модуль connection
    async with connection.async_session_maker() as session:
        # Создаем готовый объект для таблицы users
        new_user = User(
            name=payload.name,
            surname=payload.surname,
            email=payload.email,
            password=hashed_pwd,  # Сохраняем ХЭШ, а не чистый пароль!
            status="operator"  # По умолчанию ставим operator
        )

        # Переводчик SQLAlchemy формирует INSERT-запрос и отправляет в базу
        session.add(new_user)

        # Намертво сохраняем пользователя в PostgreSQL
        await session.commit()

        print(f"[DB SUCCESS]: Пользователь {payload.email} успешно сохранен в PostgreSQL!", flush=True)

        return {"success": True}

@router.post("/login")
async def login_user(payload: s_a.UserLoginRequest):
    async with connection.async_session_maker() as session:
        # Шаг 1: Ищем пользователя в PostgreSQL по email
        query = select(User).where(User.email == payload.email)
        result = await session.execute(query)
        # Если бд ничего не нашла first() возвращает None а .scalar() может выбросить системное исключение
        user = result.scalars().first()

        # Если такого email нет в базе данных
        if not user:
            # Возвращаем маркер, который Zustand переведет как "no_user"
            raise HTTPException(status_code=400, detail="no_user")

        # Шаг 2: Если email есть, проверяем пароль через bcrypt
        if not verify_password(payload.password, user.password):
            # Возвращаем маркер, который Zustand переведет как "wrong_password"
            raise HTTPException(status_code=400, detail="wrong_password")

        # Ищем все камеры, где user_id совпадает с id вошедшего пользователя
        camera_query = select(Camera).where(Camera.user_id == user.id)
        camera_result = await session.execute(camera_query)

        # Получаем список всех объектов камер из базы данных
        db_cameras = camera_result.scalars().all()

        cameras_list = [
            {
                "id": cam.id,
                "name": cam.name,
                "ip": cam.ip,
                "port": cam.port,
                "brand": cam.brand,
                "username": cam.username,
                "password": cam.password,
                "rtsp_tail": cam.rtsp_tail,
                "user_id": cam.user_id
            }
            for cam in db_cameras
        ]

        # Шаг 3: Если всё совпало, отдаем данные пользователя БЕЗ пароля
        return {
            "success": True,
            "user": {
                "name": user.name,
                "surname": user.surname,
                "email": user.email,
                "status": user.status
            },
            "cameras": cameras_list  # Передаем массив со всеми полями
        }

@router.post("/reset-password")
async def reset_password(payload: s_a.EmailCheckRequest, request: Request):
    async with connection.async_session_maker() as session:
        # 1. Проверяем, существует ли пользователь в PostgreSQL
        query = select(User).where(User.email == payload.email)
        result = await session.execute(query)
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=400, detail="no_user")

        # 2. Генерируем 4-значный код сброса
        code = str(random.randint(1000, 9999))

        # 3. ОТПРАВЛЯЕМ ПИСЬМО-ПРЕДУПРЕЖДЕНИЕ
        try:
            email_cfg = request.app.state.config.email
            text = (
                f"Здравствуйте!\n\n"
                f"Был сделан запрос на изменение пароля Вашего аккаунта в системе TrafficAI.\n"
                f"Если этот запрос подали Вы, введите данный код для продолжения: {code}\n\n"
                f"Если это были не Вы, просто проигнорируйте это сообщение. Ваш текущий пароль остается в безопасности.\n"
                f"С уважением, команда TrafficAI."
            )
            msg = MIMEText(text, "plain", "utf-8")
            msg["Subject"] = "TrafficAI: Запрос на сброс пароля"
            msg["From"] = f"TrafficAI <{email_cfg.sender_email}>"
            msg["To"] = payload.email

            await aiosmtplib.send(
                msg,
                hostname=email_cfg.smtp_server,
                port=email_cfg.smtp_port,
                username=email_cfg.sender_email,
                password=email_cfg.sender_password,
                start_tls=True
            )
            print(f"[SUCCESS EMAIL]: Код сброса {code} отправлен на {payload.email}", flush=True)

        except Exception as e:
            print(f"[ERROR EMAIL]: Не удалось отправить код сброса: {e}", flush=True)
            raise HTTPException(status_code=500, detail="email_send_failed")

        TEMP_VERIFICATION_CODES[payload.email] = code
        return {"success": True}


@router.post("/reset-password-confirm")
async def reset_password_confirm(payload: s_a.ResetPasswordConfirmRequest, request: Request):
    # Достаем код из кэша
    saved_code = TEMP_VERIFICATION_CODES.get(payload.email)

    # Если кода в кэше нет — значит 5 минут прошли и cachetools его стерла!
    if not saved_code:
        raise HTTPException(status_code=400, detail="code_expired")

    # Если код есть, но цифры не совпадают
    if saved_code != payload.user_code:
        TEMP_VERIFICATION_CODES.pop(payload.email, None)
        raise HTTPException(status_code=400, detail="invalid_code")

    # Код верный! Стираем его из кэша вручную, так как он использован
    TEMP_VERIFICATION_CODES.pop(payload.email, None)

    # Генерируем 8-значный временный пароль
    alphabet = string.ascii_letters + string.digits
    temporary_password = "".join(secrets.choice(alphabet) for _ in range(8))

    try:
        email_cfg = request.app.state.config.email
        text = (
            f"Код успешно подтвержден!\n\n"
            f"Ваш новый временный пароль для входа в систему TrafficAI: {temporary_password}\n\n"
            f"Используйте его для авторизации. После входа Вы сможете изменить его в профиле."
        )
        msg = MIMEText(text, "plain", "utf-8")
        msg["Subject"] = "TrafficAI: Ваш новый временный пароль"
        msg["From"] = f"TrafficAI <{email_cfg.sender_email}>"
        msg["To"] = payload.email

        await aiosmtplib.send(
            msg,
            hostname=email_cfg.smtp_server,
            port=email_cfg.smtp_port,
            username=email_cfg.sender_email,
            password=email_cfg.sender_password,
            start_tls=True
        )
        print(f"[SUCCESS EMAIL]: Финальный пароль отправлен на {payload.email}", flush=True)

    except Exception as e:
        print(f"[ERROR EMAIL]: Не удалось отправить финальный пароль: {e}", flush=True)
        raise HTTPException(status_code=500, detail="email_send_failed")

    # Сохраняем захешированный временный пароль в PostgreSQL
    async with connection.async_session_maker() as session:
        query = select(User).where(User.email == payload.email)
        result = await session.execute(query)
        user = result.scalars().first()

        hashed_pwd = hash_password(temporary_password)
        user.password = hashed_pwd

        await session.commit()
        print(f"[DB SUCCESS]: Пароль для {payload.email} обновлен в PostgreSQL!", flush=True)

        return {"success": True}