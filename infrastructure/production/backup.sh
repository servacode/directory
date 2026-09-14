#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/../.."
ENV_FILE="${1:-infrastructure/production/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
set -a
. "$ENV_FILE"
set +a
docker compose --env-file "$ENV_FILE" -f infrastructure/production/docker-compose.yml exec -T postgres pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/database-$stamp.dump"
docker run --rm -v health-directory_upload_data:/data:ro -v "$(cd "$BACKUP_DIR" && pwd):/backup" alpine:3.22 sh -c "tar -czf /backup/uploads-$stamp.tar.gz -C /data ."
printf 'Backup created: %s\n' "$stamp"
