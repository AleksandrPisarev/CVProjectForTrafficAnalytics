from dataclasses import dataclass
import numpy as np
from typing import Any

@dataclass(slots=True)
class Frame:
    _image: np.ndarray
    _time_stamp: float
    _yolo_result: Any = None
    _parsed_yolo_result: Any = None
    _detected_plates_widths = {}

    @property
    def image(self):
        return self._image

    @image.setter
    def image(self, value):
        self._image = value

    @property
    def time_stamp(self):
        return self._time_stamp

    @property
    def yolo_result(self):
        if self._parsed_yolo_result is not None:
            return self._parsed_yolo_result

        if self._yolo_result is None or self._yolo_result.boxes is None:
            self._parsed_yolo_result = []
            return self._parsed_yolo_result

        try:
            boxes = self._yolo_result.boxes.xyxy.cpu().numpy()
            classes = self._yolo_result.boxes.cls.cpu().numpy().astype(int)
            track_ids = self._yolo_result.boxes.id.cpu().numpy().astype(
                int) if self._yolo_result.boxes.id is not None else [-1] * len(boxes)

            self._parsed_yolo_result = [
                {"id": t_id, "box": box, "class": cls}
                for box, t_id, cls in zip(boxes, track_ids, classes)
            ]
            return self._parsed_yolo_result
        except Exception as e:
            print(f"[Ошибка парсинга YOLO] {e}")
            self._parsed_yolo_result = []
            return self._parsed_yolo_result

    @yolo_result.setter
    def yolo_result(self, value):
        self._yolo_result = value

    @property
    def detected_plates_widths(self):
        return self._detected_plates_widths

    @detected_plates_widths.setter
    def detected_plates_widths(self, value):
        self._detected_plates_widths = value