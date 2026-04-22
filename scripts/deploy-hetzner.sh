#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production"
if [[ -f ".env" ]]; then
  ENV_FILE=".env"
elif [[ -f ".env.production" ]]; then
  ENV_FILE=".env.production"
else
  echo "Missing .env or .env.production. Create one before deploy."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

COMPOSE_FILES=("-f" "docker-compose.yml" "-f" "docker-compose.prod.yml")
ENV_ARGS=("--env-file" "$ENV_FILE")

echo "Starting database..."
docker compose "${ENV_ARGS[@]}" "${COMPOSE_FILES[@]}" up -d postgres

echo "Running Prisma migrate deploy..."
docker compose "${ENV_ARGS[@]}" "${COMPOSE_FILES[@]}" run --rm --user root --entrypoint bunx api prisma migrate deploy

echo "Starting API..."
docker compose "${ENV_ARGS[@]}" "${COMPOSE_FILES[@]}" up -d --build api

echo "Deployment complete."
echo "Health check: curl http://127.0.0.1:${PORT:-4000}/health"
