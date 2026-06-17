from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase

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

