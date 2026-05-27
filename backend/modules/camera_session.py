import threading
import time
from modules.capture import Frame_capture
from modules.rendering import Rendering


class CameraSession:
    def __init__(self, config, url: str, id: str, manager):
        self.id = id
        self.manager = manager  # Ссылка на SessionManager для отправки кадров

        self.capture = Frame_capture(url)
        self.rendering = Rendering(config['rendering'])

        # 1. Сюда менеджер будет записывать кадр после YOLO
        self.last_detected_frame = None

        # 2. Сюда поток рендеринга будет записывать готовый JPEG-буфер
        self.last_encoded_frame = None

        # Замок для безопасного обновления кадров между потоками
        self.frame_lock = threading.Lock()

        self.live_stats = {"fps": 0, "auto": 0}
        self.is_running = False  # Изначально потоки выключены

    def process_run(self):
        """Включает флаг и запускает фоновые потоки. Отрабатывает мгновенно."""
        self.is_running = True

        threading.Thread(target=self._flow_capture, daemon=True).start()
        threading.Thread(target=self._flow_rendering, daemon=True).start()
        print(f"[Session {self.id}] Потоки захвата и рендеринга запущены.")

    def _flow_capture(self):
        """Фоновый поток захвата кадров из камеры"""
        for obj_frame in self.capture.process():
            if not self.is_running:
                break
            # Мгновенно отправляем свежий чистый кадр в общий котел менеджера
            self.manager.input_frame_to_batch(self.id, obj_frame)

        print(f"[Session {self.id}] Поток _flow_capture завершен.")

    def add_detection_result(self, frame_obj, auto_count):
        """
        Вызывается из SessionManager, когда YOLO закончила детекцию.
        Метод отрабатывает мгновенно, просто перекладывая кадр в переменную сессии.
        """
        if not self.is_running:
            return

        # Быстро под замком сохраняем прилетевший от YOLO кадр
        with self.frame_lock:
            self.last_detected_frame = frame_obj
            self.live_stats["auto"] = auto_count

    def _flow_rendering(self):
        """Фоновый поток рендеринга (работает параллельно)"""
        while self.is_running:
            # Заходим под замок, чтобы безопасно забрать прилетевший от YOLO кадр
            with self.frame_lock:
                frame_obj = self.last_detected_frame
                # Если менеджер еще не успел вернуть ни одного кадра, временно пропускаем итерацию
                if frame_obj is None:
                    time.sleep(0.01)
                    continue

            # Пропускаем кадр через ваш модуль Rendering (подсчет FPS + cv2.imencode)
            jpeg_buffer = self.rendering.process(frame_obj)
            self.live_stats["fps"] = self.rendering.FPS

            # Снова заходим под замок и записываем готовые байты JPEG для веб-трансляции
            with self.frame_lock:
                self.last_encoded_frame = jpeg_buffer

            # Микро-пауза, чтобы поток не грузил процессор в бесконечном цикле
            time.sleep(0.005)

        print(f"[Session {self.id}] Поток _flow_rendering завершен.")

    def get_video_stream(self):
        """Генератор байт для Эндпоинта /video_feed"""
        while True:
            if not self.is_running or self.last_encoded_frame is None:
                time.sleep(0.04)
                continue

            with self.frame_lock:
                buffer = self.last_encoded_frame

            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.03)

    def release(self):
        """Полностью тушит камеру и освобождает ресурсы"""
        # 1. Переключаем флаг в False, чтобы бесконечные циклы _flow_capture и _flow_rendering завершились
        self.is_running = False

        # 2. Вызываем встроенный метод очистки модуля capture
        if hasattr(self, 'capture'):
            self.capture.release()

        print(f"[Session {self.id}] Все ресурсы камеры успешно освобождены.")