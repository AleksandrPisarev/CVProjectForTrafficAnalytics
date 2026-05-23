import threading
from queue import Queue, Empty
import time
from modules.capture import Frame_capture
from modules.DetectionTracking import DetectionTracking
from modules.rendering import Rendering


class Object_container:
    def __init__(self, config):
        # Инициализируем только тяжелые модули, не привязанные к источнику видео
        self.detection = DetectionTracking(config['detection'])
        self.rendering = Rendering(config['rendering'])

        # Очереди для конвейера обработки
        self.capture_queue = Queue(maxsize=1)
        self.detection_queue = Queue(maxsize=1)

        # ВАЖНО: Заменяем rendering_queue на переменную + Лок для живого просмотра
        self.last_encoded_frame = None
        self.frame_lock = threading.Lock()

        self.live_stats = {"fps": 0}
        self.is_running = False  # Изначально потоки выключены
        self.capture = None  # Модуль захвата создадим позже динамически

    def start_capture(self, video_source: str):
        """Метод запускается динамически, когда фронтенд передает адрес камеры/файла"""
        if self.is_running:
            # Если что-то уже крутилось, мягко останавливаем старые потоки
            self.release()
            time.sleep(0.5)

        self.is_running = True

        # Создаем модуль захвата, передавая строку адреса напрямую (без config.yaml)
        self.capture = Frame_capture(video_source)

        # ЗАПУСКАЕМ ПОТОКИ ОБРАБОТКИ
        threading.Thread(target=self._flow_capture, daemon=True).start()
        threading.Thread(target=self._flow_detection, daemon=True).start()
        threading.Thread(target=self._flow_rendering, daemon=True).start()
        print(f"[Engine] Аналитика успешно запущена для источника: {video_source}")

    def _flow_capture(self):
        # Метод process() в Frame_capture теперь сам рулит реконнектом RTSP и перемоткой mp4
        for obj_frame in self.capture.process():
            if not self.is_running:
                break
            start_time = time.time()

            if self.capture_queue.full():
                try:
                    self.capture_queue.get_nowait()
                except Empty:
                    pass

            self.__apply_camera_fps(start_time)
            self.capture_queue.put(obj_frame)

    def _flow_detection(self):
        while self.is_running:
            try:
                frame_obj = self.capture_queue.get(timeout=1.0)
                if frame_obj is None:
                    break

                # Нейросеть обрабатывает кадр
                frame_obj = self.detection.process(frame_obj)

                if self.detection_queue.full():
                    try:
                        self.detection_queue.get_nowait()
                    except Empty:
                        pass
                self.detection_queue.put(frame_obj)
            except Empty:
                continue

    def _flow_rendering(self):
        while self.is_running:
            try:
                frame_obj = self.detection_queue.get(timeout=1.0)
                if frame_obj is None:
                    break

                # Рендеринг отрисовывает боксы YOLO
                _, encoded_frame = self.rendering.process(frame_obj)
                self.live_stats["fps"] = self.rendering.FPS

                # Безопасно записываем самый свежий кадр в переменную памяти
                with self.frame_lock:
                    self.last_encoded_frame = encoded_frame

            except Empty:
                continue

    def process_run(self):
        """Эндпоинт /video_feed будет непрерывно читать этот цикл"""
        while True:
            # Если трансляция выключена или кадров еще нет, просто слегка ждем
            if not self.is_running or self.last_encoded_frame is None:
                time.sleep(0.04)  # Имитируем ~25 FPS ожидания
                continue

            # Блокируем и быстро забираем байты кадра из памяти
            with self.frame_lock:
                buffer = self.last_encoded_frame

            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.03)  # Небольшая микропауза, чтобы не перегружать сеть

    def release(self):
        """Остановка потоков и очистка ресурсов"""
        self.is_running = False
        if self.capture:
            self.capture.release()
        try:
            self.capture_queue.put_nowait(None)
            self.detection_queue.put_nowait(None)
        except:
            pass

    def __apply_camera_fps(self, start_time):
        TARGET_FPS = 50
        FRAME_TIME = 1.0 / TARGET_FPS
        elapsed = time.time() - start_time
        sleep_time = FRAME_TIME - elapsed
        if sleep_time > 0:
            time.sleep(sleep_time)