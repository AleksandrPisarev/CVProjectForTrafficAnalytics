from dataclasses import dataclass
import numpy as np

@dataclass(slots=True)
class Frame:
    _image: np.ndarray
    _time_stamp: float

    @property
    def image(self):
        return self._image

    @image.setter
    def image(self, value):
        self._image = value

    @property
    def time_stamp(self):
        return self._time_stamp