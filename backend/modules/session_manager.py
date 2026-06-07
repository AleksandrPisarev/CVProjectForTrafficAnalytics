from modules.camera_session import CameraSession

class SessionManager:
    def __init__(self, config):
        self.config = config
        self.sessions = {}  # Словарь запущенных сессий {id: CameraSession}

    def create_session(self, url: str, id: str):
        # 1. Проверяем, не запущена ли уже камера с таким ID
        if id in self.sessions:
            raise ValueError(f"Камера с ID {id} уже запущена!")

        # 2. Проверяем лимит на 4 камеры
        if len(self.sessions) >= 4:
            raise ValueError("Ошибка: Достигнут лимит в 4 камеры!")

        # 3. Создаем сессию, передавая config, url, id и ссылку на сам менеджер (self)
        new_session = CameraSession(self.config, url, id)

        # 4. Сохраняем в словарь и запускаем потоки этой камеры
        self.sessions[id] = new_session
        new_session.process_run()

    def stop_session(self, id: str) -> bool:
        # Метод для остановки конкретной камеры (вызовется из эндпоинта /disconnect)
        if id in self.sessions:
            # Даем команду самой сессии остановить свои циклы и закрыть ресурсы
            self.sessions[id].release()
            # Удаляем её из словаря менеджера, освобождая место для новой камеры
            del self.sessions[id]
            print(f"[Manager] Сессия {id} полностью остановлена и удалена.")
            return True

        print(f"[Manager] Сессия {id} не найдена для остановки.")
        return False

    def release_all(self):
        # Метод для полной очистки при закрытии всего веб-сервера
        for camera_id, session in list(self.sessions.items()):
            session.release()
        self.sessions.clear()
        print("[Manager] Все сессии принудительно остановлены.")