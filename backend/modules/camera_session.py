import threading
import queue
import time
import cv2
import copy
from modules.capture import Frame_capture
from modules.rendering import Rendering
from modules.detection_tracking import DetectionTracking
from modules.speed_analytics import SpeedAnalytics

class CameraSession:
    def __init__(self, config, url: str, id: str):
        self.id = id
        # ФЛАГ УПРАВЛЕНИЯ НЕЙРОСЕТЬЮ: по умолчанию выключен
        self.is_AI_active = False
        self.tracker_reset = True  # Внутренний будильник для сброса трекера

        self.capture = Frame_capture(url)
        # Это поле нужно для демонстрационного режима вычисляет FPS файла один раз при старте
        # не делая обращение к C++ библиотеке OpenCV при каждой итерации цикла
        self.fps = self.capture.get_fps()

        self.rendering = Rendering(config['rendering'])
        self.detection = DetectionTracking(config['detection'])
        self.speed_analytics = SpeedAnalytics(config['speed_analytics'])

        self.raw_queue = queue.Queue(maxsize=1)
        self.render_queue = queue.Queue(maxsize=1)
        self.speed_analytics_queue = queue.Queue()
        self.latest_frame = None

        self.live_stats = {"fps": 0, "auto": 0}
        self.is_running = False  # Изначально потоки выключены

        self.read_thread = None
        self.detection_thread  = None
        self.render_thread = None
        self.speed_analytics_thread = None

    def process_run(self):
        """Включает флаг и запускает фоновые потоки. Отрабатывает мгновенно."""
        self.is_running = True

        # Сохраняем ссылки на потоки в переменные класса self.
        self.read_thread = threading.Thread(target=self._flow_read, daemon=True)
        self.detection_thread = threading.Thread(target=self._flow_detection, daemon=True)
        self.render_thread = threading.Thread(target=self._flow_rendering, daemon=True)
        self.speed_analytics_thread = threading.Thread(target=self._flow_speed_analytics, daemon=True)

        # Запускаем их
        self.read_thread.start()
        self.detection_thread.start()
        self.render_thread.start()
        self.speed_analytics_thread.start()

        print(f"[Session {self.id}] Потоки захвата и рендеринга успешно запущены и взяты на контроль.")

    def _flow_read(self):
        """ПОТОК 1: Только захват кадров из источника и отправка в сырую очередь"""
        print(f"[Поток Чтения {self.id}] НАЧАЛО РАБОТЫ")

        # Получаем итератор
        frame_generator = self.capture.process()

        # Локальный счетчик кадров для виртуальной метки времени файла
        frame_index = 0

        # Читаем кадры из модуля capture
        while self.is_running:
            # 1. Точка отсчета НАЧАЛА СЛЕДУЮЩЕГО ТАКТА (до чтения кадра!)
            start_time = time.perf_counter()

            try:
                # Читаем следующий кадр из генератора
                obj_frame = next(frame_generator)
            except StopIteration:
                break  # Генератор завершился (видео закончилось или битое)

            # ПОДСТРАХОВКА: Если из-за сбоя OpenCV все-таки проскочил битый или пустой объект кадра
            if obj_frame is None or obj_frame.image is None:
                continue  # Пропускаем этот такт, защищая очереди

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
                # Перезаписываем таймстамп строго на жесткое виртуальное время файла
                # obj_frame.time_stamp = frame_index * (1.0 / self.fps)
                # frame_index += 1
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
                # Если калибровка ГОТОВА — считаем скорость прямо здесь, в потоке рендеринга!
                # Расчет запишет 'speed' в car, и метод process ниже сразу отрисует её на экране
                if self.speed_analytics.is_calibrated:
                    self.speed_analytics.calculate_speed(obj_frame)

                    # Передаем объект кадра в модуль рендеринга.
                    # Внутри модуля метод .process() берет obj_frame.yolo_result,
                    # отрисовывает рамки, считает FPS и возвращает чистую картинку (массив numpy).
                    annotated_image = self.rendering.process(obj_frame)
                else:
                    annotated_image = self.rendering.process(obj_frame)
                    # Отправляем ссылку на кадр в очередь скорости ТОЛЬКО если ИИ включен пользователем
                    if self.is_AI_active:
                        self.speed_analytics_queue.put(obj_frame)

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
        """Генератор байт MJPEG для Эндпоинта /video_feed"""
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

    def _flow_speed_analytics(self):
        """ПОТОК 4: Параллельный расчет скорости через кольцевой буфер deque"""
        print(f"[Поток Аналитики Скорости {self.id}] НАЧАЛО РАБОТЫ")
        while self.is_running:
            # Если ИИ выключен пользователем на фронтенде
            if not self.is_AI_active:
                # Если в буфере что-то осталось с момента выключения — мгновенно чистим,
                # чтобы освободить оперативную память (ОЗУ) от тяжелых картинок
                if self.speed_analytics_queue.qsize() > 0:
                    # Подстраховка чтобы при выключении а потом включении AI веса автоматически не накапливались в словаре
                    self.speed_analytics.On_Off_data_Cy = False
                    # Очистка очереди queue.Queue
                    while not self.speed_analytics_queue.empty():
                        try:
                            self.speed_analytics_queue.get_nowait()
                            self.speed_analytics_queue.task_done()
                        except queue.Empty:
                            break

                # Поток уходит в глубокий сон на 100 миллисекунд и ждет, пока пользователь включит ИИ
                time.sleep(0.1)
                continue

            # АВТОНОМНОЕ ЗАВЕРШЕНИЕ ПОТОКА ПОСЛЕ УСПЕШНОЙ КАЛИБРОВКИ
            if self.speed_analytics.is_calibrated:
                # 1. Мгновенно чистим очередь от зависших в ней тяжелых картинок
                if self.speed_analytics_queue.qsize() > 0:
                    # Очистка очереди queue.Queue
                    while not self.speed_analytics_queue.empty():
                        try:
                            self.speed_analytics_queue.get_nowait()
                            self.speed_analytics_queue.task_done()
                        except queue.Empty:
                            break
                # 2. Выходим из главного цикла, чтобы поток полностью завершил работу
                break

            # ИИ активен! Проверяем, есть ли кадры в очереди
            if not self.speed_analytics_queue:
                # Если буфер пустой — микро-сон на 1 миллисекунду, чтобы не грузить ядро процессора
                time.sleep(0.001)
                continue

            # Забираем самый старый доступный кадр из начала буфера
            obj_frame = self.speed_analytics_queue.get()

            # Маркер полной остановки сессии камеры
            if obj_frame == "stop":
                break

            try:
                # Запускаем калибровку
                self.speed_analytics.calibration(obj_frame)
            except Exception as e:
                print(f"[Analytics Error {self.id}] Ошибка калибровки: {e}")

        print(f"[Session {self.id}] Поток Аналитики Скорости успешно завершен.")

    def release(self):
        """Полностью тушит камеру и освобождает ресурсы (3-поточная схема)"""
        print(f"[Session {self.id}] Запущена процедура полной остановки сессии...")

        # 1. Переключаем флаг в False, чтобы бесконечные циклы потоков завершились
        self.is_running = False
        self.is_AI_active = False

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

        # 3. ВЫБИВАЕМ ПОТОК РЕНДЕРИНГА ИЗ ЗАВИСАНИЯ:
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

        # 4. ВЫБИВАЕМ ПОТОК АНАЛИТИКИ СКОРОСТИ ИЗ ЗАВИСАНИЯ:
        try:
            if self.speed_analytics_queue.qsize() > 0:
                # Очистка очереди queue.Queue
                while not self.speed_analytics_queue.empty():
                    try:
                        self.speed_analytics_queue.get_nowait()
                        self.speed_analytics_queue.task_done()
                    except queue.Empty:
                        break
            # Кладем маркер "stop", который заставит цикл while True в аналитике завершиться
            self.speed_analytics_queue.put("stop")
        except Exception as e:
            print(f"[Session {self.id}] Ошибка отправки 'stop' в speed_analytics_queue: {e}")

        # 5. Вызываем встроенный метод очистки модуля capture (закрываем OpenCV / RTSP сессию)
        if hasattr(self, 'capture') and self.capture is not None:
            try:
                self.capture.release()
                print(f"[Session {self.id}] Модуль захвата capture успешно освобожден.")
            except Exception as e:
                print(f"[Session Error {self.id}] Ошибка при закрытии capture: {e}")

        # 6. АРГУМЕНТИРОВАННАЯ ЗАЩИТА: Жестко дожидаемся физической смерти ВСЕХ 3-Х ПОТОКОВ в памяти
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

        # Поток 4: Аналитика скорости
        if hasattr(self, 'speed_analytics_thread') and self.speed_analytics_thread.is_alive():
            # Просто ждем закрытия потока максимум 1 секунду
            self.speed_analytics_thread.join(timeout=1.0)

        print(f"[Session {self.id}] Все ресурсы и потоки камеры успешно освобождены.")

    def __apply_camera_fps(self, start_time):
        ''' Функция замедляющая чтение кадров, адаптируясь под реальный FPS видеофайла '''
        # Рассчитываем время кадра на основе динамического self.fps
        frame_time = 1.0 / self.fps

        # Вычисляем, сколько РЕАЛЬНО ушло времени на чтение кадра и работу с очередью
        elapsed = time.perf_counter() - start_time

        sleep_time = frame_time - elapsed
        if sleep_time > 0:
            time.sleep(sleep_time)