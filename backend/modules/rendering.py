import cv2
from collections import deque
from modules.frame import Frame

class Rendering:
    def __init__(self, config):
        self.render_cfg = config['rendering']
        if isinstance(config['capture']['source'], int):
            self.win_name = 'broadcast from camera'
        else:
            self.win_name = f'broadcast from {config["capture"]["source"]}'
        '''Очередь для хранения меток времени последних  maxlen кадров'''
        self.frame_times = deque(maxlen=self.render_cfg['fps_buffer_size'])

    def process(self, frame: Frame):
        '''Подсчет FPS'''
        self.frame_times.append(frame.time_stamp)
        if len(self.frame_times) > 1:
            total_time = self.frame_times[-1] - self.frame_times[0]
            FPS = (len(self.frame_times) - 1) / total_time
        else: FPS = 0
        '''Функция прорисовки FPS'''
        self.__draw_fps_label(frame.image, FPS)

        '''Функция изменеия размеров окна изображения'''
        self.__resized_window(frame.image, self.render_cfg['width'], self.render_cfg['height'])

        # cv2.imshow(self.win_name, frame.image)
        # Сжимаем кадр в jpg (чтобы передавать быстрее) и возвращаем в main
        return cv2.imencode('.jpg', frame.image)

    def __draw_fps_label(self, frame, FPS):
        '''Настройки шрифта и текста'''
        text = f"FPS: {FPS:.1f}"
        font = cv2.FONT_HERSHEY_PLAIN
        font_scale = 0.7
        thickness = 1
        color_text = (255, 255, 255)
        color_bg = (0, 0, 0)

        '''Вычисляем размер текста, чтобы прямоугольник подходил по размеру'''
        (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)

        '''Задаем координаты прямоугольника (верхний левый угол)'''
        x, y = 5, 5

        '''Рисуем черный прямоугольник'''
        cv2.rectangle(frame, (x, y), (x + text_width + 2, y + text_height + baseline), color_bg, -1)

        '''Рисуем белый текст поверх прямоугольника'''
        '''Координата y в putText — это линия шрифта (baseline), поэтому добавляем высоту'''
        cv2.putText(frame, text, (x + 2, y + text_height + 2), font, font_scale, color_text, thickness, cv2.LINE_AA)

    def  __resized_window(self, frame, width, height):
        '''Функция помошник преобразует строковые значени из .yaml файла в числовые'''
        width = self.__change_yaml_value(width)
        height = self.__change_yaml_value(height)

        '''Если размеры не указаны, возвращаем оригинал'''
        if width is None and height is None:
            return frame

        h, w = frame.shape[:2]

        '''Если один из параметров None, ставим бесконечность'''
        '''чтобы min() выбрал другой (реальный) коэффициент'''
        scale_w = width / w if width is not None else float('inf')
        scale_h = height / h if height is not None else float('inf')

        '''Выбираем минимальный масштаб'''
        scale = min(scale_w, scale_h)

        new_w = int(w * scale)
        new_h = int(h * scale)
        cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

    def __change_yaml_value(self, val):
        if val is None or str(val).lower() in ['none', 'null', '']:
            return None
        return val