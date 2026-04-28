from ultralytics import YOLO
import torch
import cv2
from modules.frame import Frame

class DetectionTracking:
    def __init__(self, config):
        self.model = YOLO(config['model_path'], task='detect')
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        self.conf = config.get('conf', 0.4)
        self.classes = list(config.get('classes', [2, 3, 5, 7]))
        self.tracking = config.get('tracking', "botsort.yaml")
        self.track_buffer = config.get('track_buffer', 60)

    def process(self, frame_obj: Frame):

        # 1. Прогоняем через нейросеть с трекером
        # Используем параметры, которые мы сохранили в __init__
        results = self.model.track(
            source=frame_obj.image,
            persist=True,  # Заставляет систему помнить объекты между кадрами
            conf=self.conf,  # Порог уверенности
            device=self.device,  # видеокарта или процессор
            classes=self.classes,  # [2, 3, 5, 7]
            tracker=self.tracking,  # "botsort.yaml"
            verbose=False  # Не спамим в консолье
        )

        # 2. Проверяем, есть ли результаты
        # results — это список, нам нужен первый (и единственный) элемент
        if results and len(results) > 0:

            # 3. Отрисовываем всё на кадре
            frame_obj.image = self.__draw_bboxes(results[0])

            # Возвращаем готовый кадр и сами результаты (пригодятся для статистики)
            return frame_obj

        # Если вдруг что-то пошло не так, возвращаем оригинальный кадр
        return frame_obj

    def __draw_bboxes(self, res):
        # 1. Задаем словарь цветов для классов (BGR формат)
        # 2: car, 3: motorcycle, 5: bus, 7: truck
        CLASS_COLORS = {
            2: (0, 255, 0),  # Зеленый для легковых
            3: (255, 255, 0),  # Циан/Голубой для мотоциклов
            5: (0, 165, 255),  # Оранжевый для автобусов
            7: (0, 0, 255)  # Красный для грузовиков
        }
        # Цвет по умолчанию, если попадется другой класс
        DEFAULT_COLOR = (255, 255, 255)

        # ... внутри метода отрисовки ...
        img = res.orig_img.copy()

        if res.boxes is not None and res.boxes.id is not None:
            boxes = res.boxes.xyxy.int().cpu().tolist()
            ids = res.boxes.id.int().cpu().tolist()
            clss = res.boxes.cls.int().cpu().tolist()

            for box, obj_id, cls_index in zip(boxes, ids, clss):
                x1, y1, x2, y2 = box

                # Определяем имя класса и цвет
                class_name = res.names[cls_index]
                color = CLASS_COLORS.get(cls_index, DEFAULT_COLOR)

                # Формируем текст в формате "car:244"
                label = f"{class_name}:{obj_id}"

                # Настройки текста
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.8
                thickness = 2
                txt_color = (0, 0, 0)  # Черный текст на цветном фоне

                # Считаем размер плашки
                (w, h), _ = cv2.getTextSize(label, font, font_scale, thickness)

                # Рисуем рамку объекта
                cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness=1)

                # Рисуем плашку (фон текста)
                # Делаем плашку чуть выше рамки, чтобы не перекрывать машину
                cv2.rectangle(img, (x1, y1 - h - 15), (x1 + w + 5, y1), color, -1)

                # Пишем текст "class:id"
                cv2.putText(img, label, (x1, y1 - 10), font, font_scale, txt_color, thickness, cv2.LINE_8)

        return img