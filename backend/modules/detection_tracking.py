from ultralytics import YOLO
import torch

class DetectionTracking:
    def __init__(self, config):
        self.model = YOLO(config['model_path'], task='detect')
        ''' 
        Нужно для версии yolov8m.pt для версии yolov8m.onnx self.model.to(self.device)надо закоментировать
        и self.device = 0
        '''
        # self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # self.model.to(self.device)
        self.device = 0
        self.conf = config.get('conf', 0.4)
        self.classes = list(config.get('classes', [2, 3, 5, 7]))
        self.tracking = config['tracking']
        self.track_buffer = config.get('track_buffer', 60)

    def process_frame(self, obj_frame):
        """
        Принимает одну матрицу изображения (кадр OpenCV).
        Возвращает обработанное изображение с рамками и количество объектов.
        """
        if obj_frame is None or obj_frame.image is None:
            return

        results = self.model.track(
            source=[obj_frame.image],  # Передаем одну матрицу OpenCV
            imgsz=640,
            persist=True,
            conf=self.conf,
            classes=self.classes,
            tracker=self.tracking,
            stream=True,  # Генератор возвращает результаты поочередно
            verbose=False,
            device=self.device
        )

        for result in results:
            obj_frame.yolo_result = result