from dataclasses import dataclass
import numpy as np
from typing import Any

@dataclass(slots=True)
class Frame:
    _image: np.ndarray
    _time_stamp: float
    _yolo_result: Any = None

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
        return self._yolo_result

    @yolo_result.setter
    def yolo_result(self, value):
        self._yolo_result = value