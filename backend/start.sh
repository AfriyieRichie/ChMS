#!/bin/sh
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Loading seed data..."
python manage.py loaddata apps/accounts/fixtures/initial_data.json || true

echo "Starting server..."
exec python manage.py runserver 0.0.0.0:8000
