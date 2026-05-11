FROM node:20-slim

# Устанавливаем pnpm
RUN npm install -g pnpm

WORKDIR /app

# Копируем только файл со списком библиотек
COPY package.json ./

# 1. Устанавливаем ВСЕ библиотеки с нуля
RUN pnpm install

# 2. Добавляем тот самый модуль для Linux, который капризничал
RUN pnpm add @rollup/rollup-linux-x64-gnu

# Копируем остальной код
COPY . .

EXPOSE 5173

# Запуск
CMD ["pnpm", "dev", "--host"]