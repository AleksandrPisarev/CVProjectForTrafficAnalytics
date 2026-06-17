from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Переменные для движка и фабрики сессий (инициализируем в lifespan)
engine = None
async_session_maker = None

def init_db(database_url: str):
    global engine, async_session_maker
    # Создаем асинхронный движок
    engine = create_async_engine(database_url, echo=True) # echo=True покажет SQL в консоли
    # Создаем фабрику сессий для роутеров
    async_session_maker = async_sessionmaker(engine, expire_on_commit=False)