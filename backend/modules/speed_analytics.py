from ultralytics import YOLO
import numpy as np


class SpeedAnalytics:

    def __init__(self, config):
        # 1. Загрузка второй нейросети для номеров и её параметров из yaml конфига
        self.model = YOLO(config['model_path'], task='detect')
        self.device = config.get('device', 0)
        self.conf = config.get('conf', 0.4)

        # Настройки калибровки и физические константы из конфига
        self.REQUIRED_CARS = config.get('required_calibration_cars', 10)
        self.REAL_PLATE_WIDTH = config.get('real_plate_width_meters', 0.52)  # ГОСТ 52 см
        self.speed_limit = config.get('speed_limit', 60)

        # 2. Главный результат работы модуля — Словарь Нарушителей
        self.violators_dict = {}

        # 3. Настройки и базы данных для процесса калибровки камеры
        self.calibration_database = []  # Сюда собираем фокусные расстояния F
        self.is_calibrated = False  # Флаг: готова ли калибровка камеры
        self.focal_length = None  # Финальное фокусное расстояние (в пикселях)

        # Локальная история размеров номеров для калибрующихся машин: { track_id: [width_px, ...] }
        self.plate_history = {}

        # 4. Уникальное внутреннее хранилище, ограниченное ОДНИМ предыдущим кадром
        self.previous_frame = None

    def process(self, obj_frame):

        # Забираем легкий распарсенный список машин из ленивого @property кадра
        cars_from_frame = obj_frame.yolo_result

        # Если машин на кадре нет, этот кадр нам не интересен для расчетов
        if not cars_from_frame:
            # Перед выходом перезаписываем наш список-держатель текущим кадром
            self.previous_frame = obj_frame
            return

        # ВЫРЕЗАНИЕ КРОПОВ И ПОИСК НОМЕРОВ ВТОРОЙ НЕЙРОСЕТЬЮ
        current_frame_plates = {}  # Словарь на текущий кадр: { track_id: ширина_номера_в_пикселях }

        for car in cars_from_frame:
            track_id = car["id"]
            x1, y1, x2, y2 = map(int, car["box"])  # Координаты машины на большом экране

            if track_id == -1:
                continue  # Пропускаем машины, которые трекер временно потерял

            # Вырезаем область машины из большой матрицы изображения (кроп)
            car_crop = obj_frame.image[y1:y2, x1:x2]
            if car_crop.size == 0:
                continue

            # Запускаем вторую нейросеть ONNX строго по кропу автомобиля
            # Нам не нужны трекинг и буфер для номеров, только чистый detect!
            plate_results = self.model.predict(
                source=[car_crop],
                imgsz=320,  # Для маленького кропа номера 320x320 — за глаза
                conf=self.conf,
                device=self.device,
                verbose=False
            )

            for result in plate_results:
                if result.boxes is not None and len(result.boxes) > 0:
                    # Берем самый первый найденный номер внутри кропа машины
                    px1, py1, px2, py2 = result.boxes.xyxy[0].cpu().numpy()
                    current_frame_plates[track_id] = px2 - px1
                    break

        # РАЗДЕЛЕНИЕ НА КАЛИБРОВКУ И ВЫЧИСЛЕНИЕ СКОРОСТИ
        # Часть А: Камера еще не готова — собираем данные F по первым 10 машинам
        if not self.is_calibrated:
            self._run_calibration(current_frame_plates)

        # Часть Б: Калибровка готова — вычисляем скорость и ведем violators_dict
        else:
            if self.previous_frame is None or not self.previous_frame.yolo_result:
                # Сравнивать не с чем. Запоминаем текущий кадр как прошлый и выходим ждать следующий такт.
                obj_frame.detected_plates_widths = current_frame_plates
                self.previous_frame = obj_frame
                return

            # КАЛИБРОВКА ГОТОВА — ВЫЧИСЛЯЕМ СКОРОСТЬ КМ/Ч
            # ПЕРВОСТЕПЕННАЯ ПРОВЕРКА УЕХАВШИХ МИМО 3 МЕТРОВ НАРУШИТЕЛЕЙ
            for violator_id in list(self.violators_dict.keys()):
                if violator_id not in current_frame_plates:
                    # Машина была в нарушителях, но исчезла с кадра -> СОБЫТИЕ!
                    print(f"[🔥 СОБЫТИЕ: ПРОСКОК 3М] Авто ID {violator_id} улетело из кадра! "
                          f"Нарушение зафиксировано по лучшим архивным кадрам.")
                    # Закрываем дело, сохраняем в базу нарушений и чистим ОЗУ
                    del self.violators_dict[violator_id]

            # Перебираем машины, которые сейчас физически есть на кадре
            for track_id, w_new in current_frame_plates.items():

                # ПРОВЕРКА ПОЯВЛЕНИЯ АВТО
                if track_id not in self.previous_frame.detected_plates_widths:
                    continue  # Только появилась, скорость не посчитать. Ждем следующий кадр.

                # Авто стабильно едет — ВЫЧИСЛЯЕМ ТЕКУЩУЮ СКОРОСТЬ И ДИСТАНЦИЮ
                w_past = self.previous_frame.detected_plates_widths[track_id]
                distance_past = (self.REAL_PLATE_WIDTH * self.focal_length) / w_past
                distance_new = (self.REAL_PLATE_WIDTH * self.focal_length) / w_new

                delta_S = distance_past - distance_new
                delta_t = obj_frame.time_stamp - self.previous_frame.time_stamp

                if delta_t <= 0:
                    continue
                current_speed = int((delta_S / delta_t) * 3.6)

                # АВТО УЖЕ ЕСТЬ В СЛОВАРЕ НАРУШИТЕЛЕЙ
                if track_id in self.violators_dict:

                    # Проверяем расстояние (Штатный финиш событийной модели)
                    if distance_new <= 3.0:
                        print(f"[ШТАТНОЕ СОБЫТИЕ] Авто ID {track_id} доехало до отметки 3м. "
                              f"Фиксация завершена. Данные отправлены в архив.")
                        del self.violators_dict[track_id]  # Очищаем ОЗУ

                    # Машина еще далеко (distance_new > 3.0) — работаем со скоростью
                    else:
                        if current_speed > self.violators_dict[track_id]["speed"]:
                            # Скорость выросла — переписываем ВСЁ (скорость, макс_кадр, ласт_кадр)
                            self.violators_dict[track_id]["speed"] = current_speed
                            self.violators_dict[track_id]["frame_max_speed"] = obj_frame
                            self.violators_dict[track_id]["last_frame"] = obj_frame
                        else:
                            # Скорость упала или такая же — переписываем ТОЛЬКО последний кадр
                            self.violators_dict[track_id]["last_frame"] = obj_frame

                # АВТО ЕЩЕ НЕТ В СЛОВАРЕ НАРУШИТЕЛЕЙ
                else:
                    if current_speed > self.speed_limit:
                        # Скорость превышена! Проверяем твою отсечку по расстоянию
                        if distance_new > 3.0:
                            # Машина далеко, фиксируем и заносим в violators_dict
                            self.violators_dict[track_id] = {
                                "speed": current_speed,
                                "frame_max_speed": obj_frame,
                                "last_frame": obj_frame
                            }
                            print(f"[НОВЫЙ НАРУШИТЕЛЬ] Авто ID {track_id} | Скорость: {current_speed} км/ч")

        # ОБНОВЛЕНИЕ ХРАНИЛИЩА (Перезапись)
        obj_frame.detected_plates_widths = current_frame_plates
        self.previous_frame = obj_frame

    def _run_calibration(self, current_frame_plates):
        """Внутренняя функция калибровки (Часть А)"""
        for track_id, current_w in current_frame_plates.items():

            if track_id not in self.plate_history:
                self.plate_history[track_id] = []
            self.plate_history[track_id].append(current_w)

            w_first = self.plate_history[track_id][0]
            w_last = self.plate_history[track_id][-1]

            # Если номер на экране вырос (машина едет к камере и приближается)
            if w_last - w_first > 15:
                # Рассчитываем фокусное расстояние F для этой конкретной машины
                calculated_f = (w_first * w_last * 100) / (w_last - w_first)
                self.calibration_database.append(calculated_f)

                print(
                    f"[Калибровка] Машина ID {track_id} обсчитана. Успешно: {len(self.calibration_database)}/{self.REQUIRED_CARS}")

                # Очищаем историю этой машины, чтобы не гонять её по кругу
                del self.plate_history[track_id]

        # Если набрали базу из 10 стабильных машин — закрываем калибровку
        if len(self.calibration_database) >= self.REQUIRED_CARS:
            self.focal_length = np.median(self.calibration_database)
            self.is_calibrated = True
            print(f"\n[КАЛИБРОВКА ЗАВЕРШЕНА] Геометрия линзы зафиксирована! Фокус F = {self.focal_length:.2f}\n")