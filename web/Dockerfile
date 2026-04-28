FROM node:20-slim

# Устанавливаем pnpm
RUN npm install -g pnpm

WORKDIR /app

# Копируем конфиги
COPY package.json pnpm-lock.yaml* ./

# Устанавливаем библиотеки в "плоском" режиме (node-linker=hoisted)
# Это заставит pnpm создать обычную папку node_modules без хитрых ссылок
RUN pnpm install --config.node-linker=hoisted

# Копируем остальной код
COPY . .

EXPOSE 5173

# Запуск с принудительной очисткой кэша Vite
CMD ["pnpm", "dev", "--host", "--force"]