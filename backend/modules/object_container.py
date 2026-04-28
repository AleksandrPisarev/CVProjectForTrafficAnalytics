import threading
from queue import Queue, Empty
import time
from modules.capture import Frame_capture
from modules.DetectionTracking import DetectionTracking
from modules.rendering import Rendering

class Object_container:
    def __init__(self, config):
        self.capture = Frame_capture(config['capture'])
        self.detection = DetectionTracking(config['detection'])
        self.rendering  = Rendering(config['rendering'])

        # Очереди с размером 1 (всегда храним только самый свежий кадр)
        self.capture_queue = Queue(maxsize=1)  # Сырой кадр от камеры/файла
        self.pipeline_queue = Queue(maxsize=1)  # Отрисованный JPEG для стрима

        self.live_stats = {"fps": 0}  # Данные данного кадра для React
        self.is_running = True

        # ЗАПУСК ПОТОКОВ
        threading.Thread(target=self._flow_capture, daemon=True).start()
        threading.Thread(target=self._flow_pipeline, daemon=True).start()

    def _flow_capture(self):
        for obj_frame in self.capture.process():
            if not self.is_running: break
            start_time = time.time()

            # Если очередь полная, удаляем старый кадр, чтобы положить свежий
            if self.capture_queue.full():
                try:
                    self.capture_queue.get_nowait()
                except Empty: pass
            # Функция для создания илюзии потока видео с камеры как на реальных проектах
            self.__apply_camera_fps (start_time)

            self.capture_queue.put(obj_frame)

    def _flow_pipeline(self):
        while self.is_running:
            try:
                # Ждем кадр 1 сек, чтобы иметь возможность проверить self.is_running
                frame_obj = self.capture_queue.get(timeout=1.0)

                if frame_obj is None:
                    break

                # Детекция и трекинг
                # Передаем весь объект Frame, получаем его же (обновленным) и данные детекции
                frame_obj = self.detection.process(frame_obj)

                # Рендеринг
                _, encoded_frame = self.rendering.process(frame_obj)
                self.live_stats["fps"] = self.rendering.FPS

                # Кладем в очередь для MJPEG
                if self.pipeline_queue.full():
                    try:
                        self.pipeline_queue.get_nowait()
                    except Empty:
                        pass
                self.pipeline_queue.put(encoded_frame)

            except Empty:
                continue

    def process_run(self):
        while self.is_running:
            try:
                # Ждем кадр не вечно, а например 1 секунду
                buffer = self.pipeline_queue.get(timeout=1.0)
                if buffer is None:
                    break
                yield (b'--frame\r\n'b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            except Empty:
                continue

    def release (self):
        self.is_running = False

        if hasattr(self.capture, 'cap'):
            self.capture.release()

        try:
            self.capture_queue.put_nowait(None)
            self.pipeline_queue.put_nowait(None)
        except:
            pass

    # Функция для создания илюзии потока видео с камеры как на реальных проектах
    def __apply_camera_fps (self, start_time):
        TARGET_FPS = 50
        FRAME_TIME = 1.0 / TARGET_FPS
        # Вычисляем, сколько времени заняло чтение, и ждем остаток
        elapsed = time.time() - start_time
        sleep_time = FRAME_TIME - elapsed
        if sleep_time > 0:
            time.sleep(sleep_time)