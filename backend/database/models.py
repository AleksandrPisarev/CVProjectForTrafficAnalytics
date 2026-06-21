from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase
from sqlalchemy import ForeignKey, String, Integer

# Это базовый класс, от которого будут наследоваться все таблицы
class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(nullable=False)
    surname: Mapped[str] = mapped_column(nullable=False)

    # Email делаем уникальным, чтобы нельзя было создать два аккаунта на одну почту
    email: Mapped[str] = mapped_column(unique=True, nullable=False)

    # Здесь будем хранить захэшированный пароль
    password: Mapped[str] = mapped_column(nullable=False)

    # Статус пользователя (например: "admin", "operator")
    status: Mapped[str] = mapped_column(nullable=False, default="operator")


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    ip: Mapped[str] = mapped_column(String(255), nullable=False)

    # Порт по умолчанию всегда 554
    port: Mapped[int] = mapped_column(Integer, default=554, nullable=False)

    # Оставляем nullable=True для совместимости с демо-режимом
    brand: Mapped[str | None] = mapped_column(String(50), nullable=True)
    username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    password: Mapped[str | None] = mapped_column(String(100), nullable=True)
    rtsp_tail: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Вторичный ключ, связанный с таблицей users по колонке id
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)