import threading
import queue
import time
import cv2
from modules.capture import Frame_capture
from modules.rendering import Rendering
from modules.detection_tracking import DetectionTracking


class CameraSession:
    def __init__(self, config, url: str, id: str):
        self.id = id
        # ФЛАГ УПРАВЛЕНИЯ НЕЙРОСЕТЬЮ: по умолчанию выключен
        self.is_AI_active = False
        self.tracker_reset = True  # Внутренний будильник для сброса трекера

        self.capture = Frame_capture(url)
        self.rendering = Rendering(config['rendering'])
        self.detection = DetectionTracking(config['detection'])

        self.raw_queue = queue.Queue(maxsize=1)
        self.render_queue = queue.Queue(maxsize=1)
        self.latest_frame = None

        self.live_stats = {"fps": 0, "auto": 0}
        self.is_running = False  # Изначально потоки выключены

        self.read_thread = None
        self.detection_thread  = None
        self.render_thread = None

    def process_run(self):
        """Включает флаг и запускает фоновые потоки. Отрабатывает мгновенно."""
        self.is_running = True

        # Сохраняем ссылки на потоки в переменные класса self.
        self.read_thread = threading.Thread(target=self._flow_read, daemon=True)
        self.detection_thread = threading.Thread(target=self._flow_detection, daemon=True)
        self.render_thread = threading.Thread(target=self._flow_rendering, daemon=True)

        # Запускаем их
        self.read_thread.start()
        self.detection_thread.start()
        self.render_thread.start()

        print(f"[Session {self.id}] Потоки захвата и рендеринга успешно запущены и взяты на контроль.")

    def _flow_read(self):
        """ПОТОК 1: Только захват кадров из источника и отправка в сырую очередь"""
        print(f"[Поток Чтения {self.id}] НАЧАЛО РАБОТЫ")
        # Читаем кадры из модуля capture
        for obj_frame in self.capture.process():
            if not self.is_running:
                break

            # ПОДСТРАХОВКА: Если из-за сбоя OpenCV все-таки проскочил битый или пустой объект кадра
            if obj_frame is None or obj_frame.image is None:
                continue  # Пропускаем этот такт, защищая очереди

            start_time = time.time()

            # Если сырая очередь полная, принудительно освобождаем её, выбрасывая старый кадр
            if self.raw_queue.full():
                try:
                    self.raw_queue.get_nowait()
                except queue.Empty:
                    pass  # На случай, если параллельный поток успел забрать его в эту же микросекунду

            # Теперь очередь гарантированно пуста, и мы записываем туда новый сырой кадр
            self.raw_queue.put_nowait(obj_frame)

            # Функция замедляющая чтение кадров из файла имитирующая поток из камеры
            if "demo" in self.id:
                self.__apply_camera_fps(start_time)

        print(f"[Поток Чтения {self.id}] ЗАВЕРШИЛ РАБОТУ.")

    def _flow_detection(self):
        """ПОТОК 2: Детекция (YOLO)"""
        print(f"[Поток Детекции {self.id}] НАЧАЛО РАБОТЫ")

        while self.is_running:
            # Если камера выключена, но в очереди пусто — поток уснет здесь.
            # Но метод stop() пришлет сюда "stop", и поток мгновенно проснется!
            obj_frame = self.raw_queue.get()

            # Проверка флага ИЛИ маркера остановки
            if not self.is_running or obj_frame == "stop":
                break

            # РЕЖИМ 1: Нейросеть ВКЛЮЧЕНА кнопкой из фронтенда
            if self.is_AI_active:

                # СБРОС ТРЕКЕРА: срабатывает строго ОДИН РАЗ в момент, когда кнопку переключили в True
                if self.tracker_reset:
                    try:
                        if hasattr(self.detection.model, 'predictor') and self.detection.model.predictor:
                            if self.detection.model.predictor.trackers:
                                for tracker in self.detection.model.predictor.trackers:
                                    tracker.reset()
                                print(f"[Поток Детекции {self.id}] Память BoT-SORT очищена. Новый отсчет ID.")
                    except Exception as e:
                        print(f"[Session Error {self.id}] Ошибка сброса трекера: {e}")

                    # Опускаем флаг, чтобы на следующем кадре трекер НЕ сбрасывался и продолжал вести машины!
                    self.tracker_reset = False

                try:
                    self.detection.process_frame(obj_frame)
                except Exception as e:
                    print(f"[Session Error {self.id}] Ошибка YOLO: {e}")
                    continue

                # Отправляем готовый объект в рендеринг. Если рендеринг занят, детекция ждет.
                # Если в этот момент нажать stop(), метод stop() очистит render_queue,
                # этот put() завершится, цикл поднимется наверх и закроется по флагу is_running.
                self.render_queue.put(obj_frame)

            # РЕЖИМ 2: Нейросеть ВЫКЛЮЧЕНА — чистый транзит
            else:
                obj_frame.yolo_result = None

                # Взводим флаг обратно. Когда пользователь снова включит кнопку,
                # поток один раз зайдет в условие выше, обнулится и продолжит трекинг
                self.tracker_reset = True

                # БЕЗ ОЖИДАНИЯ (Drop Frames): кадр сырой, нам его не жалко.
                # Если очередь рендеринга полна — принудительно выкидываем старый кадр
                if self.render_queue.full():
                    try:
                        self.render_queue.get_nowait()
                    except queue.Empty:
                        pass

                # Записываем свежий транзитный кадр мгновенно
                self.render_queue.put_nowait(obj_frame)

        print(f"[Поток Детекции {self.id}] ЗАВЕРШИЛ РАБОТУ.")

    def _flow_rendering(self):
        """ПОТОК 3: Управление рендерингом, сбор финальной статистики и обновление переменной кадра"""
        print(f"[Поток Рендеринга {self.id}] НАЧАЛО РАБОТЫ")

        while self.is_running:
            # Поток глубоко спит на блокировке, пока детекция не пришлет кадр.
            # Если вызвать метод stop(), сюда прилетит маркер "stop" и мгновенно разбудит поток.
            obj_frame = self.render_queue.get()

            # ЖЕЛЕЗНАЯ ПРОВЕРКА ОСТАНОВКИ: если флаг сброшен или прилетел маркер — выходим из цикла
            if not self.is_running or obj_frame == "stop":
                break

            try:
                # 1. Передаем объект кадра в модуль рендеринга.
                # Внутри модуля метод .process() берет obj_frame.yolo_result,
                # отрисовывает рамки, считает FPS и возвращает чистую картинку (массив numpy).
                annotated_image = self.rendering.process(obj_frame)

                # 2. Сохраняем размеченную картинку в переменную для FastAPI.
                # Перезапись ссылки на объект в Python атомарна, замки (Lock) не нужны.
                self.latest_frame = annotated_image

                # 3. Забираем актуальные цифры FPS и количества машин из модуля рендеринга
                self.live_stats["fps"] = self.rendering.FPS
                self.live_stats["auto"] = self.rendering.auto_count

            except Exception as e:
                # Защита конвейера: если на одном кадре отрисовка или подсчет FPS сломались,
                # мы логируем ошибку, но поток продолжает жить и обрабатывать следующие кадры.
                print(f"[Session Error {self.id}] Ошибка в модуле рендеринга: {e}")
                continue

        print(f"[Поток Рендеринга {self.id}] ЗАВЕРШИЛ РАБОТУ.")

    def get_video_stream(self):
        """Генератор байт MJPEG для Эндпоинта /video_feed (Сжатие через TurboJPEG)"""
        print(f"[Generator {self.id}] Сетевой генератор MJPEG запущен.")

        while self.is_running:
            # Фиксируем ссылку на текущий кадр в локальную переменную.
            # Если поток рендеринга перезапишет self.latest_frame в эту же миллисекунду,
            # у нас в current_raw_frame останется старая рабочая матрица и код не упадет.
            current_raw_frame = self.latest_frame

            # Если сессия запущена, но рендеринг еще просто не успел подготовить самый первый кадр
            if current_raw_frame is None:
                time.sleep(0.03)  # Спим немного и идем на проверку заново
                continue

            try:
                # [cv2.IMWRITE_JPEG_QUALITY, 70] — зажимаем качество до 70%, чтобы летело быстрее
                success, encoded_img = cv2.imencode('.jpg', current_raw_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])

                if not success:
                    continue

                # Переводим в байты
                jpeg_bytes = encoded_img.tobytes()

                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpeg_bytes + b'\r\n')
            except Exception as e:
                print(f"[Generator Error {self.id}] Ошибка сжатия OpenCV: {e}")
                time.sleep(0.01)
                continue

            # Небольшая пауза для удержания стабильного FPS в сетевом потоке
            time.sleep(0.03)

        print(f"[Generator {self.id}] Сетевой генератор полностью уничтожен.")

    def release(self):
        """Полностью тушит камеру и освобождает ресурсы (3-поточная схема)"""
        print(f"[Session {self.id}] Запущена процедура полной остановки сессии...")

        # 1. Переключаем флаг в False, чтобы бесконечные циклы потоков завершились
        self.is_running = False

        # 2. ВЫБИВАЕМ ПОТОК ДЕТЕКЦИИ ИЗ ЗАВИСАНИЯ:
        try:
            # Очищаем очередь, если она полная, чтобы "stop" гарантированно поместился
            if self.raw_queue.full():
                try:
                    self.raw_queue.get_nowait()
                except queue.Empty:
                    pass
            # Используем обычный .put(), чтобы гарантировать запись маркера
            self.raw_queue.put("stop")
        except Exception as e:
            print(f"[Session {self.id}] Ошибка отправки 'stop' в raw_queue: {e}")

        # ВЫБИВАЕМ ПОТОК РЕНДЕРИНГА ИЗ ЗАВИСАНИЯ:
        try:
            # Очищаем очередь, если она полная, чтобы "stop" гарантированно поместился
            if self.render_queue.full():
                try:
                    self.render_queue.get_nowait()
                except queue.Empty:
                    pass
            # Используем обычный .put(), чтобы гарантировать запись маркера
            self.render_queue.put("stop")
        except Exception as e:
            print(f"[Session {self.id}] Ошибка отправки 'stop' в render_queue: {e}")

        # 3. Вызываем встроенный метод очистки модуля capture (закрываем OpenCV / RTSP сессию)
        if hasattr(self, 'capture') and self.capture is not None:
            try:
                self.capture.release()
                print(f"[Session {self.id}] Модуль захвата capture успешно освобожден.")
            except Exception as e:
                print(f"[Session Error {self.id}] Ошибка при закрытии capture: {e}")

        # 4. АРГУМЕНТИРОВАННАЯ ЗАЩИТА: Жестко дожидаемся физической смерти ВСЕХ 3-Х ПОТОКОВ в памяти
        # Ждем закрытия каждого потока максимум 1 секунду, чтобы не подвесить всё приложение

        # Поток 1: Чтение
        if hasattr(self, 'read_thread') and self.read_thread.is_alive():
            self.read_thread.join(timeout=1.0)

        # Поток 2: Детекция (YOLO)
        if hasattr(self, 'detection_thread') and self.detection_thread.is_alive():
            self.detection_thread.join(timeout=1.0)

        # Поток 3: Рендеринг
        if hasattr(self, 'render_thread') and self.render_thread.is_alive():
            self.render_thread.join(timeout=1.0)

        print(f"[Session {self.id}] Все ресурсы и потоки камеры успешно освобождены.")

    def __apply_camera_fps(self, start_time):
        ''' Функция замедляющая чтение кадров из файла имитирующаю поток из камеры'''
        TARGET_FPS = 40
        FRAME_TIME = 1.0 / TARGET_FPS
        elapsed = time.time() - start_time
        sleep_time = FRAME_TIME - elapsed
        if sleep_time > 0:
            time.sleep(sleep_time)