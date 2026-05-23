import asyncio
import socket
import subprocess
from concurrent.futures import ThreadPoolExecutor
import os
import time
import cv2
from threading import Thread

class CameraManager:
    def __init__(self):
        # Создаем пул потоков, чтобы поиск не вешал основной сервер
        self.executor = ThreadPoolExecutor(max_workers=5)

    def _get_local_subnet(self):
        """
        Железный способ для защиты проекта без интернета.
        Находит IP физической сетевой карты (кабеля), даже если Wi-Fi отключен.
        """
        try:
            hostname = socket.gethostname()
            # getaddrinfo вытаскивает абсолютно все сетевые адреса, прописанные в Windows
            addr_info = socket.getaddrinfo(hostname, None)

            # Собираем все найденные IPv4 адреса в один чистый список
            all_ips = []
            for item in addr_info:
                ip = item[4][0]
                # Проверяем, что это IPv4, а не IPv6 (в IPv4 есть точки)
                if "." in ip and ip not in all_ips:
                    all_ips.append(ip)

            # 1. СНАЧАЛА ИЩЕМ НАШ КАБЕЛЬ (заданный вручную диапазон 192.168.X.X)
            for ip in all_ips:
                if ip.startswith("127.") or ip.startswith("169.254."):
                    continue
                if ip.startswith("192.168."):
                    ip_octets = ip.split('.')
                    prefix = f"{ip_octets[0]}.{ip_octets[1]}.{ip_octets[2]}"
                    return f"{prefix}.X", prefix

            # 2. ПЛАН Б: Если прописать другую статическую сеть (например, 10.X.X.X)
            # код возьмет первый попавшийся реальный адрес, который не является заглушкой
            for ip in all_ips:
                if not ip.startswith("127.") and not ip.startswith("169.254."):
                    ip_octets = ip.split('.')
                    prefix = f"{ip_octets[0]}.{ip_octets[1]}.{ip_octets[2]}"
                    return f"{prefix}.X", prefix

        except Exception as e:
            print(f"[Network Error] Ошибка определения IP на автономном стенде: {e}")

        return None, None

    def _find_free_ips(self, prefix: str):
        """Быстро пингует диапазон адресов, чтобы найти 3 свободных IP"""
        if not prefix:
            return []

        free_ips = []
        for i in range(170, 196):
            test_ip = f"{prefix}.{i}"
            try:
                res = subprocess.run(
                    ["ping", "-n", "1", "-w", "150", test_ip],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                if res.returncode != 0:
                    free_ips.append(test_ip)
            except Exception:
                free_ips.append(test_ip)

            if len(free_ips) >= 3:
                break
        return free_ips

    def _open_stream(self, data: dict) -> dict:
        """Проверяет видеопоток через OpenCV. Выполняется в пуле потоков."""
        ip = data.get("ip")
        username = data.get("username")
        password = data.get("password")
        brand = data.get("brand")
        rtsp_tail = data.get("rtsp_tail")

        # 1. Сборка ссылки (Xiongmai — в конец, остальные — в начало)
        if brand.lower() == "xiongmai":
            clean_tail = rtsp_tail.replace("user=admin", f"user={username}").replace("PASSWORD", password)
            url = f"rtsp://{ip}:554{clean_tail}"
        else:
            tail = rtsp_tail if rtsp_tail.startswith("/") else f"/{rtsp_tail}"
            url = f"rtsp://{username}:{password}@{ip}:554{tail}"

        # 1.5. Быстрая сетевая проверка порта перед запуском OpenCV
        try:
            # Пытаемся подключиться к порту 554. Тайм-аут 1.5 секунды.
            with socket.create_connection((ip, 554), timeout=1.5):
                pass
        except (socket.timeout, OSError):
            # Если хост недоступен или порт закрыт, сразу отдаем ошибку фронтенду
            return {
                "success": False,
                "error": "Камера недоступна. Проверьте IP-адрес или подключение к сети."
            }

        # 2. Проверка потока кодом OpenCV
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;udp|stimeout;3000000|timeout;3000000"
        cap = cv2.VideoCapture(url)
        is_opened = False

        def try_open():
            nonlocal is_opened
            if cap.isOpened():
                success, _ = cap.read()
                if success:
                    is_opened = True

        thread = Thread(target=try_open)
        thread.start()

        timeout = 3.5
        start_time = time.time()
        while thread.is_alive():
            if time.time() - start_time > timeout:
                break
            time.sleep(0.1)

        cap.release()

        # 3. Возвращаем ИЛИ текст ошибки, ИЛИ успех и url
        if not is_opened:
            return {"success": False, "error": "Ошибка авторизации. Неверный логин, пароль или RTSP-путь."}

        return {"success": True, "url": url}

    async def get_network_diagnosis(self):
        """Асинхронная обертка для сбора свободных IP и диапазона сети"""
        loop = asyncio.get_event_loop()
        subnet_range, prefix = await loop.run_in_executor(self.executor, self._get_local_subnet)
        free_ips = await loop.run_in_executor(self.executor, self._find_free_ips, prefix)
        return subnet_range, free_ips

    async def check_camera(self, data: dict):
        """Асинхронная обертку для запуска потока в OpenCV"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, self._open_stream, data)

# Создаем экземпляр менеджера
camera_manager = CameraManager()