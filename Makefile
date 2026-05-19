.PHONY: up down logs migrate makemigrations test seed createsuperuser shell lint

## Start all services (postgres, redis, backend) in the background
up:
	docker compose up -d

## Stop all services
down:
	docker compose down

## Tail backend logs
logs:
	docker compose logs -f backend

## Apply pending migrations
migrate:
	docker compose exec backend python manage.py migrate

## Generate new migration files after model changes
makemigrations:
	docker compose exec backend python manage.py makemigrations

## Run the full test suite
test:
	docker compose exec backend pytest

## Load seed fixtures
seed:
	docker compose exec backend python manage.py loaddata apps/accounts/fixtures/initial_data.json

## Create a Django superuser interactively
createsuperuser:
	docker compose exec backend python manage.py createsuperuser

## Open a Django shell
shell:
	docker compose exec backend python manage.py shell

## Run ruff linter
lint:
	docker compose exec backend ruff check apps/
