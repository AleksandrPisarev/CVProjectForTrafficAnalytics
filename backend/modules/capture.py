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

    def process(self):
        while True:
            try:
                # Безопасно проверяем, открыт ли захват, перед чтением
                if self.cap is not None and self.cap.isOpened():
                    ret, frame = self.cap.read()
                else:
                    ret, frame = False, None
            except Exception as e:
                # Сюда прилетит C++ исключение OpenCV в момент нажатия кнопки "Выключить"
                print(f"[Capture Error] Поток чтения прерван при закрытии сессии: {e}")
                break  # Мгновенно выходим из цикла, не запуская реконнекты!

            if not ret or frame is None:
                # СЦЕНАРИЙ ДЛЯ IP-КАМЕРЫ: Сеть моргнула, пропало питание или перезагрузка
                if isinstance(self.video_source, str) and "://" in self.video_source:
                    print(f"[Capture Warning] Потерян поток. Реконнект к {self.video_source} через 3 сек...")

                    try:
                        self.cap.release()
                        time.sleep(3.0)
                        self.cap = cv2.VideoCapture(self.video_source)
                    except Exception as e:
                        print(f"[Capture Error] Ошибка при попытке реконнекта: {e}")
                        break
                    continue
                else:
                    # СЦЕНАРИЙ ДЛЯ ТЕСТОВОГО ФАЙЛА .mp4: Перемотать на начало
                    try:
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = self.cap.read()
                        if not ret or frame is None:
                            break  # Если файл поврежден, выходим из цикла
                    except Exception:
                        break

            time_stamp = time.perf_counter()
            yield Frame(_image=frame, _time_stamp=time_stamp)

    def release(self):
        """Освобождение ресурсов."""
        self.cap.release()
        # cv2.destroyAllWindows()