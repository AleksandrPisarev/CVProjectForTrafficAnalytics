import os
import cv2
import time
from modules.frame import Frame

class Frame_capture:
    '''Модуль для чтения кадров с видеопотока'''

    def __init__(self, config):
        self.video_patch = config['source']

        self.__validate_path()

        self.cap = cv2.VideoCapture(self.video_patch)

        if not self.cap.isOpened():
            raise RuntimeError(f"Ошибка в файле capture.py | Не удалось открыть источник: {self.video_patch}")

    def __validate_path(self):
        '''Внутренний метод для проверки корректности пути'''
        is_file = os.path.isfile(str(self.video_patch))
        is_camera = isinstance(self.video_patch, int)
        is_url = isinstance(self.video_patch, str) and "://" in self.video_patch

        if not (is_file or is_camera or is_url):
            raise FileNotFoundError(
                f"Ошибка в файле capture.py | Источник '{self.video_patch}' не найден или имеет неверный формат. "
                f"Ожидался существующий файл или ID камеры (int) или URL."
            )

    def process(self):
        try:
            while True:
                time_stamp = time.perf_counter()
                ret, frame = self.cap.read()
                if not ret:
                    break

                yield Frame(_image=frame, _time_stamp=time_stamp)
        finally:
            self.cap.release()
            cv2.destroyAllWindows()

    def release(self):
        """Освобождение ресурсов."""
        self.cap.release()
        cv2.destroyAllWindows()