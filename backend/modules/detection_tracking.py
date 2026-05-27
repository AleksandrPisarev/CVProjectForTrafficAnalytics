from ultralytics import YOLO
import torch
import cv2

class DetectionTracking:
    def __init__(self, config):
        self.model = YOLO(config['model_path'], task='detect')
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # Нужно для версии yolov8m.pt для версии yolov8m.onnx self.model.to(self.device) закоментировать
        # self.model.to(self.device)
        self.conf = config.get('conf', 0.4)
        self.classes = list(config.get('classes', [2, 3, 5, 7]))
        self.tracking = config['tracking']
        self.track_buffer = config.get('track_buffer', 60)

    def process_batch(self, images_list: list, camera_ids: list) -> list:
        """
        Принимает пачку картинок и пачку ID.
        Возвращает список обработанных изображений в том же порядке.
        """
        if not images_list:
            return []

        # Превращаем IP-адреса в уникальные числа для изоляции трекеров внутри YOLO
        stream_indices = [abs(hash(cid)) for cid in camera_ids]

        # Прогоняем всю пачку картинок через YOLO одним разом
        results = self.model.track(
            source=images_list,  # Передаем список матриц OpenCV
            imgsz=640,
            persist=True,
            conf=self.conf,
            device=self.device,
            classes=self.classes,
            tracker=self.tracking,
            stream=True,  # Генератор возвращает результаты поочередно
            verbose=False,
            stream_id=stream_indices  # Изолирует историю треков для каждого потока
        )

        processed_images = []
        objects_counts = []  # Список для хранения количества авто на каждой камере

        # Проходим по результатам (YOLO возвращает их строго в порядке подачи на вход)
        for result in results:
            # Отрисовываем рамки вашей оригинальной функцией
            img_with_boxes = self.__draw_bboxes(result)
            processed_images.append(img_with_boxes)

            # 2. Считаем количество обнаруженных авто на этом кадре
            if result.boxes is not None:
                count = len(result.boxes)
            else:
                count = 0
            objects_counts.append(count)

        return processed_images, objects_counts

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
                label = f"{class_name}:{obj_id % 1000}..."

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