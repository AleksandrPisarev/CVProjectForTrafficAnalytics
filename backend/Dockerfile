FROM nvidia/cuda:12.6.0-runtime-ubuntu22.04

# Убираем интерактивные запросы при установке
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update --fix-missing && apt-get install -y \
    python3 \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    python3-dev \
    # Добавляем для psycopg2 и сборки расширений
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Сначала копируем только requirements, чтобы не пересобирать слои при изменении кода
COPY requirements.txt .

# Ставим зависимости. ВАЖНО: сначала pip, потом остальное
RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel && \
    pip3 install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]