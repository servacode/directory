#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/../.."
ENV_FILE="${1:-infrastructure/production/.env.production}"
node scripts/production-preflight.mjs "$ENV_FILE"
COMPOSE="docker compose --env-file $ENV_FILE -f infrastructure/production/docker-compose.yml"
$COMPOSE build api admin
$COMPOSE up -d postgres
$COMPOSE run --rm api node scripts/db-migrate.mjs
$COMPOSE run --rm api node scripts/db-seed.mjs
$COMPOSE up -d api admin caddy
$COMPOSE ps
printf '%s\n' 'Deployment started. Run production smoke tests before declaring GO.'
