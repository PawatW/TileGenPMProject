#!/bin/sh
set -e

python -c "from app import app, init_database; init_database(app)"

exec python -m gunicorn --bind 0.0.0.0:5001 --workers 2 --timeout 180 app:app
