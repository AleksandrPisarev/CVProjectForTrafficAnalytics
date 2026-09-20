import queue
import threading
import onnxruntime as ort
import cv2
import numpy as np
from fast_plate_ocr import LicensePlateRecognizer
import base64
import requests

class LPRManager(threading.Thread):
    def __init__(self, ip, config):
        # Обязательно инициализируем базовый класс потока
        super().__init__(daemon=True)

        self.camera_ip = ip

        # ЛОКАЛЬНАЯ ОЧЕРЕДЬ ДЛЯ КАДРОВ: Рендеринг будет пушить кадры сюда
        self.input_queue = queue.Queue()

        # Лимит скорости (изначально None, изменится из роута FastAPI)
        self.speed_limit = None

        # Внутреннее досье нарушителей для этой конкретной камеры
        self.violators_tracker = {}

        self.confidence = config.get('conf', 0.4)

        self.plate_session = ort.InferenceSession(
            config.get('model_path'),
            providers=['CPUExecutionProvider']
        )

        self.ocr_recognizer = LicensePlateRecognizer( "cct-s-v2-global-model", device="cpu")

    def run(self):
        """Этот метод выполняется в отдельном физическом потоке при вызове .start()"""
        while True:
            # Поток засыпает на вызове .get(), не нагружая процессор вхолостую
            obj_frame = self.input_queue.get()

            # Если прилетела строка-маркер остановки
            if obj_frame == "stop":
                print(f"[LPR Manager {self.camera_ip}] Поток успешно остановлен и завершен.")
                break  # Выходим из цикла, поток уничтожается ОС автоматически

            cars_from_frame = getattr(obj_frame, "yolo_result", [])

            for car in cars_from_frame:
                track_id = car["id"]
                if track_id == -1:
                    continue

                current_y = car["box"][-1]  # Нижняя координата Y рамки авто

                # Безопасно достаем скорость (если кадра 0.25 сек ещё не прошло — вернёт None)
                speed_kmh = car.get("speed")
                if speed_kmh is None:
                    continue  # Пропускаем, скорость на этом кадре ещё не рассчитана

                # Авто нет в self.violators_tracker
                if track_id not in self.violators_tracker:

                    # Проверяем скорость
                    if speed_kmh <= self.speed_limit:
                        continue  # Скорость не превышает — авто не интересно, идём дальше

                    self.violators_tracker[track_id] = {
                        "max_speed": speed_kmh,
                        "proof_frame": obj_frame.image,
                        "proof_box": car["box"],
                        "dropout_counter": 0,
                        "history_plates": {}
                    }

                # Авто есть в self.violators_tracker
                else:
                    # Если текущая скорость больше уже записанной превышенной
                    if speed_kmh > self.violators_tracker[track_id]["max_speed"]:

                        # Переписываем данные на новый пик превышения
                        self.violators_tracker[track_id]["max_speed"] = speed_kmh
                        self.violators_tracker[track_id]["proof_frame"] = obj_frame.image
                        self.violators_tracker[track_id]["proof_box"] = car["box"]

                # Проверяем, доехало ли авто до зоны чтения номера
                if obj_frame.image.shape[0] - 280 <= current_y <= obj_frame.image.shape[0] - 80:
                    # Вызываем функцию распознавания номера
                    result = self._read_license_plate(obj_frame.image, car["box"])
                    # Проверяем, что нейросеть хоть что-то нашла (результат не None)
                    if result is not None:
                        # Распаковываем текст номера и картинку номера
                        plate_text, plate_crop = result

                        # Убеждаемся, что в карточке нарушителя уже создан словарь для истории
                        if "history_plates" not in self.violators_tracker[track_id]:
                            self.violators_tracker[track_id]["history_plates"] = {}

                        self.violators_tracker[track_id]["history_plates"][plate_text] = plate_crop

            self.process_completed_violators(obj_frame)

    def process_completed_violators(self, obj_frame):
        """
        Вызывается сразу после цикла обработки машин на кадре.
        """
        # Собираем ID машин текущего кадра
        current_cars_dict = {car["id"]: car["box"] for car in obj_frame.yolo_result}

        # Итерируемся по копии ключей, чтобы можно было безопасно делать del внутри цикла
        for track_id in list(self.violators_tracker.keys()):
            data = self.violators_tracker[track_id]

            # Проверяем, есть ли нарушитель на текущем кадре
            if track_id in current_cars_dict:
                data["dropout_counter"] = 0

                if current_cars_dict[track_id][-1] > obj_frame.image.shape[0] - 80:
                    # Финализируем номер прямо внутри data["history_plates"]
                    history = data.get("history_plates", {})
                    if not history:
                        data["history_plates"] = {"номер не определен": None}

                    # Передаем всю карточку нарушителя в функцию отправки
                    self.send(data)
                    # Сразу очищаем память
                    del self.violators_tracker[track_id]

            else:
                # Машины нет в кадре — включаем счетчик
                if "dropout_counter" not in data:
                    data["dropout_counter"] = 0

                data["dropout_counter"] += 1

                if data["dropout_counter"] >= 10:
                    # Машина пропала, финализируем и отправляем то, что успели накопить
                    history = data.get("history_plates", {})
                    if not history:
                        data["history_plates"] = {"номер не определен": None}

                    self.send(data)
                    del self.violators_tracker[track_id]

    def _read_license_plate(self, image, car_box):

        # Вырезаем кроп машины с защитой от выхода за границы кадра
        x1, y1, x2, y2 = map(int, car_box)
        h_img, w_img = image.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_img, x2), min(h_img, y2)

        car_crop = image[y1:y2, x1:x2]
        if car_crop.size == 0:
            return None

        # Логика пропорционального изменения размера (Letterbox) под 320x320
        target_size = 320
        h_crop, w_crop = car_crop.shape[:2]

        # Вычисляем коэффициент масштабирования, чтобы картинка вписалась в 320x320
        scale = min(target_size / w_crop, target_size / h_crop)
        new_w = int(w_crop * scale)
        new_h = int(h_crop * scale)

        # Пропорционально сжимаем или увеличиваем кроп
        resized_crop = cv2.resize(car_crop, (new_w, new_h))

        # Создаем черный квадрат 320x320
        letterbox_img = np.zeros((target_size, target_size, 3), dtype=np.uint8)

        # Размещаем картинку внутри черного квадрата
        # Вычисляем отступы, чтобы картинка была по центру по горизонтали,
        # но ПРИЖАТА К НИЖНЕМУ КРАЮ по вертикали (чтобы не потерять номер внизу)
        x_offset = (target_size - new_w) // 2
        y_offset = target_size - new_h  # Сдвигаем в самый низ, весь черный зазор уйдет НАВЕРХ

        # Вставляем уменьшенную машину в подготовленный черный квадрат
        letterbox_img[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized_crop

        # 4. Переводим в blob/тензор для ONNX
        blob = letterbox_img.astype(np.float32) / 255.0
        blob = np.transpose(blob, (2, 0, 1))
        blob = np.expand_dims(blob, axis=0)

        # Запуск нейросети на CPU через self.plate_session
        # Используем лаконичный run(None, ...) без создания лишних переменных слоев
        outputs = self.plate_session.run(None, {self.plate_session.get_inputs()[0].name: blob})

        # Превращаем результат в простой список предсказаний
        # Каждая строка теперь содержит: [x_center, y_center, w, h, confidence]
        predictions = np.squeeze(outputs).T

        best_box = None
        max_conf = 0.0

        for pred in predictions:
            confidence = float(pred[4])  # Уверенность всегда на 4-й позиции (5-й элемент)

            # Если уверенность выше нашего порога и она лучшая из всех
            if confidence > self.confidence and confidence > max_conf:
                max_conf = confidence
                best_box = pred[0:4]  # Запоминаем координаты [x, y, w, h] лучшего номера

        # Если цикл завершился, но мы ничего не нашли выше порога confidence
        if best_box is None:
            return None

        # Разворачиваем координаты центра, ширину и высоту
        x_c, y_c, w, h = best_box

        # Переводим в обычные углы x1, y1, x2, y2 прямо внутри размера 320x320
        p_x1 = max(0, int(x_c - w / 2))
        p_y1 = max(0, int(y_c - h / 2))
        p_x2 = min(320, int(x_c + w / 2))
        p_y2 = min(320, int(y_c + h / 2))

        # Вырезаем номер прямо из картинки 320x320
        plate_crop = letterbox_img[p_y1:p_y2, p_x1:p_x2]

        if plate_crop.size == 0:
            return None

        # Передаем картинку plate_crop (массив numpy) напрямую в текстовую нейросеть
        # Метод возвращает список объектов-предсказаний, забираем первый элемент
        predictions = self.ocr_recognizer.run([plate_crop])

        if not predictions:
            return None

        prediction = predictions[0]

        # Извлекаем чистый готовый текст модели
        plate_text = str(prediction.plate).upper().replace(" ", "")

        # Увеличиваем картинку номера для читабельности
        scale_factor = 4
        new_plate_w = int(plate_crop.shape[1] * scale_factor)
        new_plate_h = int(plate_crop.shape[0] * scale_factor)

        plate_crop_large = cv2.resize(
            plate_crop,
            (new_plate_w, new_plate_h),
            interpolation=cv2.INTER_CUBIC
        )

        return plate_text, plate_crop_large

    def send(self, violator_data):
        """
           Отрисовывает графику, масштабирует кадры и отправляет JSON-пакет в FastAPI.
        """
        # 1. Извлекаем данные из структуры словаря
        speed = violator_data["max_speed"]
        proof_frame = violator_data["proof_frame"].copy()  # Копируем, чтобы не испортить видеопоток
        box = violator_data["proof_box"]
        history_plates = violator_data["history_plates"]

        x1, y1, x2, y2 = map(int, box)

        # 2. ОТРИСОВКА РАМКИ НА ПОЛНОМ КАДРЕ (в пикселях оригинала для точности)
        cv2.rectangle(proof_frame, (x1, y1), (x2, y2), (0, 0, 255), 1)  # Красная рамка

        # 3. ВЫРЕЗАЕМ КРОП МАШИНЫ С ГРАФИКОЙ (уже обведенную в рамку)
        h_img, w_img = proof_frame.shape[:2]
        cx1, cy1 = max(0, x1), max(0, y1)
        cx2, cy2 = min(w_img, x2), min(h_img, y2)
        car_crop = proof_frame[cy1:cy2, cx1:cx2]

        # 4. МАСШТАБИРОВАНИЕ КАРТИНЫ 1: Полный кадр уменьшаем до ширины 960px для базы/фронта
        target_frame_w = 960
        scale_frame = target_frame_w / w_img
        target_frame_h = int(h_img * scale_frame)
        proof_frame_resized = cv2.resize(proof_frame, (target_frame_w, target_frame_h), interpolation=cv2.INTER_AREA)

        # 5. МАСШТАБИРОВАНИЕ КАРТИНЫ 2: Пропорционально жмем кроп машины под 300px по большей стороне
        if car_crop.size > 0:
            h_car, w_car = car_crop.shape[:2]
            car_scale = 300 / max(h_car, w_car)
            new_car_w, new_car_h = int(w_car * car_scale), int(h_car * car_scale)
            car_crop_resized = cv2.resize(car_crop, (new_car_w, new_car_h), interpolation=cv2.INTER_AREA)
        else:
            car_crop_resized = np.zeros((100, 100, 3), dtype=np.uint8)  # Заглушка, если кроп пустой

        # 6. КОДИРОВАНИЕ ВСЕХ КАРТИНОК В BASE64 СТРОКИ
        # Полный кадр с рамкой
        _, buf_full = cv2.imencode('.jpg', proof_frame_resized)
        base64_full = base64.b64encode(buf_full).decode('utf-8')

        # Кроп машины с рамкой
        _, buf_car = cv2.imencode('.jpg', car_crop_resized)
        base64_car = base64.b64encode(buf_car).decode('utf-8')

        # Варианты номеров (они уже увеличены в 4 раза в функции _read_license_plate)
        encoded_variants = {}
        for plate_text, plate_img in history_plates.items():
            if plate_img is not None:
                _, buf_plate = cv2.imencode('.jpg', plate_img)
                base64_plate = base64.b64encode(buf_plate).decode('utf-8')
                encoded_variants[plate_text] = f"data:image/jpeg;base64,{base64_plate}"
            else:
                encoded_variants[plate_text] = None

        # 7. СБОРКА ИТОГОВОГО JSON ПАКЕТА (передаем только числа и Base64 текст)
        payload = {
            "camera_id": str(self.camera_ip),
            "max_speed": float(speed),
            "speed_limit": float(self.speed_limit),
            "proof_image": f"data:image/jpeg;base64,{base64_full}",
            "car_image": f"data:image/jpeg;base64,{base64_car}",
            "plate_variants": encoded_variants  # Словарь вида {"НОМЕР": "base64..."}
        }

        # 8. ОТПРАВКА ПО СЕТИ В FASTAPI
        fastapi_url = "http://127.0.0.1:8000/api/violators"
        try:
            response = requests.post(fastapi_url, json=payload, timeout=5)
            if response.status_code == 201:
                print(f"[LPR SEND SUCCESS] Нарушитель отправлен в FastAPI!")
            else:
                print(f"[LPR SEND WARNING] Ответ сервера: {response.status_code}")
        except Exception as e:
            print(f"[LPR SEND ERROR] Ошибка подключения к FastAPI: {e}")