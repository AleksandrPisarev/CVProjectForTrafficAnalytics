# Собрать и запустить всё (web + api), сразу удалив старые слои образов
up:
	docker system prune -a -f
	docker-compose up --build

# Просто запуск без пересборки (если библиотеки не менялись)
run:
	docker-compose up

# Остановить контейнеры
down:
	docker-compose down

# Посмотреть логи бэкенда (удобно для отладки)
logs:
	docker logs -f cvproject-api

clean:
	docker-compose down
	docker system prune -a -f