#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env.production" ]]; then
  echo "Missing .env.production. Copy .env.production.example and fill values first."
  exit 1
fi

set -a
source .env.production
set +a

COMPOSE_FILES=("-f" "docker-compose.yml" "-f" "docker-compose.prod.yml")

echo "Starting database..."
docker compose "${COMPOSE_FILES[@]}" up -d postgres

echo "Running Prisma migrate deploy..."
docker compose "${COMPOSE_FILES[@]}" run --rm api bunx prisma migrate deploy

echo "Starting API..."
docker compose "${COMPOSE_FILES[@]}" up -d --build api

echo "Deployment complete."
echo "Health check: curl http://127.0.0.1:${PORT:-4000}/health"
