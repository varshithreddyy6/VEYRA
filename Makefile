# ══════════════════════════════════════════════════════════════════════════
#  CREDIT CARD FRAUD DETECTION SYSTEM — developer tasks
#
#  Targets assume you run from the repository root. Python commands use
#  `python` (activate your venv first); Node commands use `npm` (installed
#  frontend deps first). Docker targets need Docker Desktop.
# ══════════════════════════════════════════════════════════════════════════

SHELL := /bin/bash
PYTHON ?= python
PIP ?= pip

.DEFAULT_GOAL := help

.PHONY: help setup frontend-setup env db-start redis-start migrate train \
        backend frontend worker test test-backend test-frontend lint \
        docker-up docker-down docker-logs clean artifacts

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

setup: ## Create venv and install backend + frontend dependencies
	python -m venv .venv
	. .venv/bin/activate && pip install --upgrade pip && pip install -r backend/requirements.txt
	cd frontend && npm install

frontend-setup: ## Install frontend dependencies
	cd frontend && npm install

env: ## Create .env from the example template
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env from .env.example"; else echo ".env already exists"; fi

db-start: ## Start PostgreSQL 16 (Docker) on port 5432
	docker run -d --name ccdfs-postgres -p 5432:5432 \
		-e POSTGRES_USER=fraud -e POSTGRES_PASSWORD=fraud_dev_password -e POSTGRES_DB=fraud_detector \
		-v ccdfs_pgdata:/var/lib/postgresql/data \
		postgres:16-alpine || docker start ccdfs-postgres

db-stop: ## Stop the PostgreSQL container
	docker stop ccdfs-postgres

redis-start: ## Start Redis 7 (Docker) on port 6379
	docker run -d --name ccdfs-redis -p 6379:6379 \
		-v ccdfs_redisdata:/data redis:7-alpine || docker start ccdfs-redis

redis-stop: ## Stop the Redis container
	docker stop ccdfs-redis

migrate: ## Apply Alembic migrations to the configured database
	cd backend && . ../.venv/bin/activate && alembic upgrade head

seed: ## Seed demo users (analyst@example.com / admin@example.com, password: Password123!)
	cd backend && . ../.venv/bin/activate && python -m app.db.seed

train: ## Train the fraud model (downloads data automatically if missing)
	cd backend && . ../.venv/bin/activate && python train_model.py --target pr_auc

backend: ## Start the FastAPI dev server on http://localhost:8000
	cd backend && . ../.venv/bin/activate && uvicorn app.main:app --reload --port 8000

worker: ## Start the Celery worker (requires Redis)
	cd backend && . ../.venv/bin/activate && celery -A app.workers.celery_app worker -l info -Q batch,default

frontend: ## Start the Vite dev server on http://localhost:5173
	cd frontend && npm run dev

test: test-backend test-frontend ## Run the full test suite

test-backend: ## Run backend tests (pytest)
	cd backend && . ../.venv/bin/activate && pytest -q

test-frontend: ## Run frontend tests (vitest)
	cd frontend && npm run test

lint: ## Type-check + lint the frontend, byte-compile the backend
	cd frontend && npm run typecheck
	cd backend && . ../.venv/bin/activate && python -m compileall -q app fraud_detector train_model.py

docker-up: ## Build and start the full stack (postgres, redis, api, worker, frontend)
	docker compose up --build -d

docker-down: ## Stop the full stack
	docker compose down

docker-logs: ## Follow container logs
	docker compose logs -f

clean: ## Remove caches and generated artifacts (keeps .env)
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; \
	rm -rf .pytest_cache .mypy_cache frontend/dist
	@echo "Cache cleaned."
