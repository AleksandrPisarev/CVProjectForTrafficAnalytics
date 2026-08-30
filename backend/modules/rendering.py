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

        cars = frame.yolo_result

        if cars:
            self.auto_count = len(cars)
        else:
            self.auto_count = 0

        annotated_image = self.__draw_bboxes(frame.image, cars)

        # Возвращаем готовую размеченную картинку в виде сырого массива пикселей
        return annotated_image

    def __draw_bboxes(self, image_raw, res) -> np.ndarray:
        """Отрисовка рамок поверх переданного изображения на основе легкого списка"""
        # Если ИИ выключен или машин в кадре нет (res — пустой список []),
        # возвращаем оригинальную чистую картинку без изменений
        if not res:
            return image_raw

        # Настройки цветов для классов (BGR формат)
        CLASS_COLORS = {
            2: (0, 255, 0),  # Зеленый для легковых (car)
            3: (255, 255, 0),  # Голубой для мотоциклов (motorcycle)
            5: (0, 165, 255),  # Оранжевый для автобусов (bus)
            7: (0, 0, 255),  # Красный для грузовиков (truck)
        }

        # Названия классов, чтобы не лезть в res.names
        CLASS_NAMES = {
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck"
        }
        DEFAULT_COLOR = (255, 255, 255)

        # Делаем копию текущей картинки кадра для безопасного рисования
        img = image_raw.copy()

        # Параметры шрифта для минималистичного дизайна
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.8
        thickness_text = 1  # Тонкий современный шрифт
        thickness_line = 1  # Тонкие линии для сносок

        for car in res:
            obj_id = car["id"]
            cls_index = car["class"]
            x1, y1, x2, y2 = map(int, car["box"])

            class_name = CLASS_NAMES.get(cls_index, "vehicle")
            color = CLASS_COLORS.get(cls_index, DEFAULT_COLOR)

            # Формируем текст
            # 1. Если скорость уже посчитана модулем аналитики
            if 'speed' in car:
                label = f"{class_name}: {car['speed']:.1f} km/h"

            # 2. Если скорость еще не посчитана (идет автокалибровка), выводим ID
            elif obj_id != -1:
                label = f"{class_name}:{obj_id % 1000}"

            # 3. На случай, если машина без ID и без скорости
            else:
                label = f"{class_name}"

            # 1. Рисуем саму рамку объекта (тонкая стильная линия)
            cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness=thickness_line)

            # Считаем длину текста в пикселях, чтобы знать длину горизонтальной полочки
            (text_w, text_h), _ = cv2.getTextSize(label, font, font_scale, thickness_text)

            # 2. Вычисляем ключевые точки для выноски (от верхнего левого угла x1, y1)
            # Точка начала ножки (прямо на углу рамки)
            p_start = (x1, y1)

            # Точка изгиба ножки (уходим вверх на 20 пикселей и влево на 20 пикселей)
            # Защита от выхода за верхнюю границу кадра: если y1 слишком мал, ведем линию вниз
            offset_y = -20 if y1 > 30 else 20
            p_bend = (x1 - 20, y1 + offset_y)

            # Точка конца полочки (ведем линию влево на длину текста + небольшой запас)
            p_end = (p_bend[0] - text_w - 5, p_bend[1])

            # Рисуем линии сноски
            cv2.line(img, p_start, p_bend, color, thickness=thickness_line, lineType=cv2.LINE_AA)
            cv2.line(img, p_bend, p_end, color, thickness=thickness_line, lineType=cv2.LINE_AA)

            # Вычисляем позицию для текста (на 6 пикселей выше полочки сноски)
            text_x = p_end[0] + 2
            text_y = p_bend[1] - 6 if offset_y < 0 else p_bend[1] + text_h + 6

            # ТЕПЕРЬ ЧИСТЫЙ ЧЕРНЫЙ ТЕКСТ
            cv2.putText(
                img,
                label,
                (text_x, text_y),
                font,
                font_scale,
                (0, 0, 0),  # Чистый черный цвет text
                thickness_text,
                lineType=cv2.LINE_AA  # Сглаживание линий букв
            )

        return img