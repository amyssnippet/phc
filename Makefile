.PHONY: all build up down restart logs clean test test-backend test-frontend demo-reset

all: build up

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

clean:
	docker compose down -v

test: test-backend test-frontend

test-backend:
	docker compose exec backend npm run test

test-frontend:
	docker compose exec frontend npm run test

demo-reset:
	docker compose exec backend npm run demo:reset
