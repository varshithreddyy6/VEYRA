# ── CREDIT CARD FRAUD DETECTION SYSTEM — API image ─────────────────────────
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    MPLBACKEND=Agg

WORKDIR /app

# System deps kept minimal; shap/numba ship manylinux wheels so no compiler is needed.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh

# Migrations run automatically; the API binds inside the container on 8000.
CMD ["/app/entrypoint.sh"]
