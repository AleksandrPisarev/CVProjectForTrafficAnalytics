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
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Сначала копируем только requirements, чтобы не пересобирать слои при изменении кода
COPY requirements.txt .

# Ставим зависимости. ВАЖНО: сначала pip, потом остальное
RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel && \
    pip3 install --no-cache-dir -r requirements.txt

# ХИТРОСТЬ: Принудительно скачиваем ONNX-модель номеров РФ прямо в процессе сборки образа.
# Модель весит всего 5 МБ, она скачается и зашьётся внутрь образа навсегда!
RUN python -c "from fast_plate_ocr import LicensePlateRecognizer; LicensePlateRecognizer('cct-s-v2-global-model', device='cpu')"

COPY . .

CMD ["python", "main.py"]