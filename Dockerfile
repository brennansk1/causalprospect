# ──────────────────────────── frontend build stage ────────────────────────────
FROM node:22-alpine AS dashboard-build
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ ./
# Copy whatever processed artifacts exist at build time so static fallback works.
COPY data/processed/ /tmp/processed/
RUN mkdir -p public/data && (cp /tmp/processed/*.json public/data/ 2>/dev/null || true) && \
    npm run build

# ────────────────────────────── Python runtime ────────────────────────────────
FROM python:3.12-slim AS runtime

# System deps: libomp for XGBoost, GDAL for rasterio.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgomp1 \
      gdal-bin \
      libgdal-dev \
      curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml ./
COPY causalprospect/ ./causalprospect/
COPY scripts/ ./scripts/

RUN pip install --no-cache-dir -e .

# Bring in pre-built static dashboard.
COPY --from=dashboard-build /app/dashboard/dist ./dashboard-dist
COPY data/processed/ ./data/processed/

ENV PYTHONUNBUFFERED=1 \
    CP_CACHE=/app/data/cache

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "causalprospect.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
