import os
import cv2
import time
from modules.frame import Frame

class Frame_capture:
    '''Модуль для чтения кадров с видеопотока'''

    def __init__(self, video_source):
        self.video_source = video_source

        self.__validate_path()

        self.cap = cv2.VideoCapture(self.video_source)

        if not self.cap.isOpened():
            raise RuntimeError(f"Ошибка в файле capture.py | Не удалось открыть источник: {self.video_source}")

    def __validate_path(self):
        '''Внутренний метод для проверки корректности пути'''
        is_file = os.path.isfile(str(self.video_source))
        is_camera = isinstance(self.video_source, int)
        is_url = isinstance(self.video_source, str) and "://" in self.video_source

        if not (is_file or is_camera or is_url):
            raise FileNotFoundError(
                f"Ошибка в файле capture.py | Источник '{self.video_source}' не найден или имеет неверный формат. "
                f"Ожидался существующий файл или ID камеры (int) или URL."
            )

    # функция замедляющая чтение кадров из файла имитирующаю поток из камеры
    def __apply_camera_fps(self, start_time):
        TARGET_FPS = 50
        FRAME_TIME = 1.0 / TARGET_FPS
        elapsed = time.time() - start_time
        sleep_time = FRAME_TIME - elapsed
        if sleep_time > 0:
            time.sleep(sleep_time)

    def process(self):
        while True:
            start_time = time.time()
            ret, frame = self.cap.read()
            if not ret:
                # Проверяем тип источника: это сетевой стрим или файл?
                if isinstance(self.video_source, str) and "://" in self.video_source:
                    # СЦЕНАРИЙ ДЛЯ IP-КАМЕРЫ: Сеть моргнула, пропало питание или перезагрузка
                    print(f"[Capture Warning] Потерян поток. Реконнект к {self.video_source} через 3 сек...")
                    self.cap.release()
                    time.sleep(3.0)
                    self.cap = cv2.VideoCapture(self.video_source)
                    continue
                else:
                    # СЦЕНАРИЙ ДЛЯ ТЕСТОВОГО ФАЙЛА .mp4: Перемотать на начало
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = self.cap.read()
                    if not ret:
                        break  # Если файл поврежден, выходим из цикла

            if not (isinstance(self.video_source, str) and "://" in self.video_source):
                self.__apply_camera_fps(start_time)

            time_stamp = time.perf_counter()
            yield Frame(_image=frame, _time_stamp=time_stamp)

    def release(self):
        """Освобождение ресурсов."""
        self.cap.release()
        # cv2.destroyAllWindows()