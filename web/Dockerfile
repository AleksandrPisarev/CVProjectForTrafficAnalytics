FROM node:20-slim

# Устанавливаем pnpm
RUN npm install -g pnpm

WORKDIR /app

# Копируем только файл со списком библиотек
COPY package.json ./

# 1. Устанавливаем ВСЕ библиотеки с нуля. Добавляем флаг игнорирования блокировок скриптов
RUN pnpm install --ignore-scripts

# 2. Добавляем модуль для Linux
RUN pnpm add @rollup/rollup-linux-x64-gnu --ignore-scripts

# Копируем остальной код
COPY . .

EXPOSE 5173

# Запуск
CMD ["pnpm", "dev", "--host"]