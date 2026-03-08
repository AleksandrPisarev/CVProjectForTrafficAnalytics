# Базовый образ NVIDIA
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

# Исправляем проблему с репозиториями и ставим Python
# Мы не пишем 3.10, а пишем просто python3, чтобы система сама выбрала доступный
RUN apt-get update --fix-missing && apt-get install -y \
    python3 \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Создаем ссылку, чтобы команда python работала
RUN ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Копируем и ставим зависимости
COPY requirements.txt .

# Используем pip3 явно
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]