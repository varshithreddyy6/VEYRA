#!/bin/sh
# Container entrypoint: apply migrations, optionally train a first model,
# then run the API with Gunicorn-managed Uvicorn workers.
set -e

echo "[entrypoint] Applying Alembic migrations…"
python -m alembic upgrade head || echo "[entrypoint] Migration failed — continuing (startup will reveal DB issues)"

echo "[entrypoint] Starting Credit Card Fraud Detection System API…"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
