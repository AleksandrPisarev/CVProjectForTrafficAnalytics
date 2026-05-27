import time
import threading
from modules.detection_tracking import DetectionTracking

class SessionManager:
    def __init__(self, config):
        self.config = config
        self.sessions = {}  # Словарь запущенных сессий {id: CameraSession}

        # Общий словарь-корзина для сборки пачки кадров от всех камер
        self.common_detection_queue = {}
        self.batch_lock = threading.Lock()  # Замок для безопасной записи/чтения корзины

        # Инициализируем ОДИН экземпляр нейросети на все 4 камеры
        self.detection = DetectionTracking(self.config)

        # Флаг работы глобального потока детекции
        self.is_running = True

        # Оригинальный поток детекции (запускается один раз при старте сервера)
        threading.Thread(target=self._global_flow_detection, daemon=True).start()

    def create_session(self, url: str, id: str):
        # 1. Проверяем, не запущена ли уже камера с таким ID
        if id in self.sessions:
            raise ValueError(f"Камера с ID {id} уже запущена!")

        # 2. Проверяем лимит на 4 камеры
        if len(self.sessions) >= 4:
            raise ValueError("Ошибка: Достигнут лимит в 4 камеры!")

        # Импортируем локально, чтобы избежать циклического импорта между файлами
        from modules.camera_session import CameraSession

        # 3. Создаем сессию, передавая config, url, id и ссылку на сам менеджер (self)
        new_session = CameraSession(self.config, url, id, self)

        # 4. Сохраняем в словарь и запускаем потоки этой камеры
        self.sessions[id] = new_session
        new_session.process_run()

    def input_frame_to_batch(self, camera_id: str, frame_obj):
        # Этот метод вызывает каждая камера из своего потока захвата,
        # чтобы безопасно под своим ID положить свежий кадр в общую корзину
        with self.batch_lock:
            self.common_detection_queue[camera_id] = frame_obj

    def _global_flow_detection(self):
        # Бесконечный поток, который разгребает общую корзину пачками
        while self.is_running:
            # Даем микро-паузу в 3 миллисекунды. За это время все параллельные
            # потоки камер гарантированно успеют сбросить свои кадры в общий котел.
            time.sleep(0.003)
            with self.batch_lock:
                # Если камеры еще не успели накидать кадров — спим 1 мс, разгружая CPU
                if not self.common_detection_queue:
                    time.sleep(0.001)
                    continue

                # Быстро копируем накопленную пачку и очищаем корзину для следующих кадров
                current_batch = self.common_detection_queue.copy()
                self.common_detection_queue.clear()

            # Подготавливаем параллельные списки для YOLO
            camera_ids = list(current_batch.keys())  # Список IP-адресов
            frames_list = list(current_batch.values())  # Список объектов Frame

            # Извлекаем чистые картинки OpenCV (матрицы пикселей) в один массив
            images_batch = [f.image for f in frames_list]

            # Отдаем ВСЮ пачку картинок в YOLO за один проход видеокарты
            processed_images, objects_counts = self.detection.process_batch(images_batch, camera_ids)

            # Раскладываем обработанные картинки обратно по своим CameraSession
            for camera_id, processed_img, frame_obj, auto_count in zip(camera_ids, processed_images, frames_list, objects_counts):
                if camera_id in self.sessions:
                    # Записываем картинку с нарисованными рамками внутрь объекта кадра
                    frame_obj.image = processed_img
                    # Возвращаем готовый кадр "домой" в конкретную сессию для рендеринга
                    self.sessions[camera_id].add_detection_result(frame_obj, auto_count)

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
        self.is_running = False
        for camera_id, session in list(self.sessions.items()):
            session.release()
        self.sessions.clear()
        print("[Manager] Все сессии принудительно остановлены.")