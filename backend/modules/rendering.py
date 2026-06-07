import cv2
from collections import deque
import numpy as np
from modules.frame import Frame

class Rendering:
    def __init__(self, config):
        self.config = config
        '''Очередь для хранения меток времени последних  maxlen кадров'''
        self.frame_times = deque(maxlen=config['fps_buffer_size'])
        self.FPS = 0
        self.auto_count = 0

    def process(self, frame: Frame):
        '''Подсчет FPS'''
        self.frame_times.append(frame.time_stamp)
        if len(self.frame_times) > 1:
            total_time = self.frame_times[-1] - self.frame_times[0]
            if total_time > 0:
                self.FPS = (len(self.frame_times) - 1) / total_time
            else:
                self.FPS = 0.0

        if frame.yolo_result is not None:
            self.auto_count = len(frame.yolo_result)
        else:
            self.auto_count = 0

        annotated_image = self.__draw_bboxes(frame.image, frame.yolo_result)

        # Возвращаем готовую размеченную картинку в виде сырого массива пикселей
        return annotated_image

    def __draw_bboxes(self, image_raw, res) -> np.ndarray:
        """Отрисовка рамок YOLO поверх переданного изображения"""
        # Если для этого кадра детекции не было (пропущенный такт) или yolo упало —
        # возвращаем оригинальную чистую картинку без изменений
        if res is None:
            return image_raw

        # Настройки цветов для классов (BGR формат)
        # 2: car, 3: motorcycle, 5: bus, 7: truck
        CLASS_COLORS = {
            2: (0, 255, 0),  # Зеленый для легковых
            3: (255, 255, 0),  # Циан/Голубой для мотоциклов
            5: (0, 165, 255),  # Оранжевый для автобусов
            7: (0, 0, 255),  # Красный для грузовиков
        }
        DEFAULT_COLOR = (255, 255, 255)

        # Делаем копию текущей картинки кадра для безопасного рисования
        img = image_raw.copy()

        if res.boxes is not None and res.boxes.id is not None:
            boxes = res.boxes.xyxy.int().cpu().tolist()
            ids = res.boxes.id.int().cpu().tolist()
            clss = res.boxes.cls.int().cpu().tolist()

            for box, obj_id, cls_index in zip(boxes, ids, clss):
                x1, y1, x2, y2 = box

                class_name = res.names[cls_index]
                color = CLASS_COLORS.get(cls_index, DEFAULT_COLOR)

                # Формируем текст в формате "car:244"
                label = f"{class_name}:{obj_id % 1000}..."

                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.8
                thickness = 2
                txt_color = (0, 0, 0)  # Черный текст на цветном фоне

                # Считаем размер плашки
                (w, h), _ = cv2.getTextSize(
                    label, font, font_scale, thickness
                )

                # Рисуем рамку объекта
                cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness=1)

                # Рисуем плашку (фон текста) чуть выше рамки
                cv2.rectangle(
                    img, (x1, y1 - h - 15), (x1 + w + 5, y1), color, -1
                )

                # Пишем текст "class:id"
                cv2.putText(
                    img,
                    label,
                    (x1, y1 - 10),
                    font,
                    font_scale,
                    txt_color,
                    thickness,
                    cv2.LINE_8,
                )

        return img