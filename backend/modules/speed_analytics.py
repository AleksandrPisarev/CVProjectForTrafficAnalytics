import numpy as np


class SpeedAnalytics:

    def __init__(self, config):

        # Настройки калибровки и физические константы из конфига
        self.speed_limit = config.get('speed_limit', 60)

        self.filter_traffic_direction = {} # Словарь фильтрации попутного транспрта {track_id: []}
        # Временный словарь сначало в калибровки потом в вычислении скорости
        self.tracking_buffer = {}
        # Словарь весов Cy по id авто
        self.y_weights = {}
        self.On_Off_data_Cy = False # Флаг включение выключение накопления данных для весов Cy
        self.calibration_speed = 0
        self.waiting_for_id = False # Флаг что сбор данных окончен и можно вводит ID авто для калибровки
        self.is_calibrated = False  # Флаг: готова ли калибровка камеры

        # Главный результат работы модуля — Словарь Нарушителей
        self.violators_dict = {}

    def calculate_speed(self, obj_frame):
        if self.y_weights is None:
            return

        cars_from_frame = obj_frame.yolo_result

        # Если машин на кадре нет, дальнейший расчет скорости не требуется
        if not cars_from_frame:
            return

        self._filter_traffic_direction(obj_frame)

        for car in cars_from_frame:
            track_id = car["id"]
            current_y = car["box"][-1]
            if track_id == -1:
                continue

            if (track_id in self.filter_traffic_direction and
                self.filter_traffic_direction[track_id][0] == 'oncoming' and
                150 <= current_y <= 1000):

                current_time = obj_frame.time_stamp

                if track_id not in self.tracking_buffer:
                    # Структура: [стартовое_время, стартовый_Y, счетчик_пропадания, скорость]
                    self.tracking_buffer[track_id] = [current_time, current_y, 0, None]
                    continue

                # Если машина уже есть в буфере — сбрасываем её счетчик пропадания обратно в 0, так как она на экране!
                self.tracking_buffer[track_id][2] = 0

                # Вытаскиваем сохраненную опорную точку из прошлого
                past_time = self.tracking_buffer[track_id][0]
                past_y = self.tracking_buffer[track_id][1]

                if (current_time - past_time) >= 0.25:
                    # Обертываем в int(), чтобы range() работал без ошибок
                    y1_idx = int(round(past_y))
                    y2_idx = int(round(current_y))

                    # Переводим пиксели в метры и считаем скорость в КМ/Ч
                    distance_meters = sum(self.y_weights[y] for y in range(y1_idx, y2_idx + 1))
                    speed_kmh = distance_meters / (current_time - past_time) * 3.6
                    # Текущий кадр становится новым стартом для следующего замера через 0.25 сек
                    self.tracking_buffer[track_id] = [current_time, current_y, 0, speed_kmh]

                # Записываем скорость в словарь машины для отображения на экране
                if self.tracking_buffer[track_id][3] is not None:
                    car['speed'] = self.tracking_buffer[track_id][3]

        # Очистка буфера с запасом в 10 кадров
        current_frame_ids = {car["id"] for car in cars_from_frame if car["id"] != -1}

        for historic_id in list(self.tracking_buffer.keys()):
            # Если машины нет на текущем кадре
            if historic_id not in current_frame_ids:
                # Увеличиваем счетчик пропадания
                self.tracking_buffer[historic_id][2] += 1

                # Держим трек до 10 кадров моргания нейросети!
                if self.tracking_buffer[historic_id][2] >= 10:
                    del self.tracking_buffer[historic_id]

    def calibration(self, obj_frame):

        # Если кнопка на фронтенде еще не нажата — сбор данных закрыт, уходим
        if not self.On_Off_data_Cy or self.calibration_speed <= 0:
            return

        # Забираем легкий распарсенный список машин из @property кадра
        cars_from_frame = obj_frame.yolo_result

        # Если машин на кадре нет, этот кадр нам не интересен для расчетов
        if not cars_from_frame:
            return

        self._filter_traffic_direction(obj_frame)

        for car in cars_from_frame:
            track_id = car["id"]

            if track_id == -1:
                continue  # Пропускаем машины, которые трекер временно потерял

            # Проверка что авто является встречным а не попутным
            if track_id in self.filter_traffic_direction and self.filter_traffic_direction[track_id][0] == 'oncoming':

                current_time = obj_frame.time_stamp
                current_y = car["box"][-1]

                if track_id not in self.tracking_buffer:
                    self.tracking_buffer[track_id] = [current_time, current_y]
                    continue

                past_time, past_y = self.tracking_buffer[track_id]

                if current_y - past_y >= 100:
                    # Узнаем реальные метры за время current_time - past_time
                    distance_meters = (self.calibration_speed /3.6) * (current_time - past_time)

                    # Находим вес пикселя Cy: метры делим на пройденные пиксели
                    Cy = distance_meters / (current_y - past_y)

                    # Находим тот самый средний пиксель микро-шага
                    y_mid = (past_y + current_y) / 2

                    # Создаем пустой список под этот конкретный ID, если его еще нет в базе
                    if track_id not in self.y_weights:
                        self.y_weights[track_id] = []

                    # Записываем пару [Y, Cy] строго в ячейку этого автомобиля!
                    self.y_weights[track_id].append([y_mid, Cy])

                    # Текущий кадр становится новым стартом для следующего шага
                    self.tracking_buffer[track_id] = [current_time, current_y]

    def _filter_traffic_direction(self, obj_frame):
        """Функция фильтрации попутного и встречного автотранспорта"""
        for car in obj_frame.yolo_result:
            track_id = car["id"]
            if track_id == -1:
                continue

            current_y = car["box"][-1]

            # Если машины нет в словаре — инициализируем список: [стартовый_y, статус, счетчик_кадров]
            if track_id not in self.filter_traffic_direction:
                self.filter_traffic_direction[track_id] = ['undefined', 0, current_y]

            # Если машина уже есть
            else:
                # Если она вернулась после пропадания — сбрасываем счетчик пропадания обратно в 0!
                self.filter_traffic_direction[track_id][1] = 0

                # Если статус до сих пор 'undefined', проверяем вектор движения по пикселям
                if self.filter_traffic_direction[track_id][0] == 'undefined':
                    delta_y = current_y - self.filter_traffic_direction[track_id][2]

                    # Проверяем, преодолела ли машина порог в 15 пикселей во избежание шумов
                    if abs(delta_y) >= 15:
                        if delta_y > 0:
                            # Встречная! Меняем статус, а стартовый Y удаляем (оставляем только 2 элемента)
                            self.filter_traffic_direction[track_id] = ['oncoming', 0]
                        else:
                            # Попутная!
                            self.filter_traffic_direction[track_id] = ['passing', 0]

        # Очистка уехавших машин
        for historic_id in list(self.filter_traffic_direction.keys()):
            # Если машины нет на текущем кадре
            if historic_id not in [car["id"] for car in obj_frame.yolo_result]:
                # Увеличиваем счетчик пропадания конкретно для этого ID
                self.filter_traffic_direction[historic_id][1] += 1
                # Если машина отсутствует уже больше 3 кадров — окончательно удаляем её
                if self.filter_traffic_direction[historic_id][1] >= 3:
                    del self.filter_traffic_direction[historic_id]

    def _build_y_pixel_map(self, car_id):
        """
            Финальный расчет калибровки. Строит непрерывную математическую кривую перспективы
            по накопленному облаку точек и генерирует идеальную карту весов для ВСЕХ пикселей кадра (от 0 до 1080).
        """

        # Проверяем, ввели ли правильный ID и накопились ли по нему точки
        if car_id not in self.y_weights or len(self.y_weights[car_id]) < 3:
            self.is_calibrated = True
            self.tracking_buffer.clear()
            self.y_weights = None
            print(f"[Ошибка калибровки] Данные по ID {car_id} не найдены или точек слишком мало!")
            return False

        # Разделяем облако точек на два массива чисел
        # Y_point — это координаты Y на экране, Y_weights — это соответствующие им веса Cy
        Y_point = np.array([point[0] for point in self.y_weights[car_id] if point[0] <= 1000])
        Y_weights = np.array([point[1] for point in self.y_weights[car_id] if point[0] <= 1000])

        # Сортируем безопасные точки сверху вниз (по возрастанию Y)
        sort_indices = np.argsort(Y_point)
        Y_point_sorted = Y_point[sort_indices]
        Y_weights_sorted = Y_weights[sort_indices]

        # Сглаживаем шумы: веса должны строго убывать сверху вниз
        Y_weights_smoothed = np.minimum.accumulate(Y_weights_sorted)

        # Интерполируем веса для каждой из 1080 строк экрана
        all_y = np.arange(1080)
        interpolated_values = np.interp(all_y, Y_point_sorted, Y_weights_smoothed)

        # Перезаписываем словарь весов для функции calculate_speed
        self.y_weights = {y: float(interpolated_values[y]) for y in range(1080)}

        self.is_calibrated = True
        self.tracking_buffer.clear()

        print(f" [АВТОКАЛИБРОВКА УСПЕШНО ЗАВЕРШЕНА] ")

        return True