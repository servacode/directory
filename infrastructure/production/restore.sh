#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/../.."

ENV_FILE="${1:-infrastructure/production/.env.production}"
DB_BACKUP="${2:-}"
UPLOAD_BACKUP="${3:-}"

if [ -z "$DB_BACKUP" ] || [ -z "$UPLOAD_BACKUP" ]; then
  echo "Usage: CONFIRM_PRODUCTION_RESTORE=RESTORE $0 <env-file> <database.dump> <uploads.tar.gz>" >&2
  exit 2
fi
if [ "${CONFIRM_PRODUCTION_RESTORE:-}" != "RESTORE" ]; then
  echo "Refusing destructive restore. Set CONFIRM_PRODUCTION_RESTORE=RESTORE explicitly." >&2
  exit 2
fi
[ -f "$ENV_FILE" ] || { echo "Environment file not found: $ENV_FILE" >&2; exit 2; }
[ -f "$DB_BACKUP" ] || { echo "Database backup not found: $DB_BACKUP" >&2; exit 2; }
[ -f "$UPLOAD_BACKUP" ] || { echo "Upload backup not found: $UPLOAD_BACKUP" >&2; exit 2; }

set -a
. "$ENV_FILE"
set +a
: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_DB:?POSTGRES_DB required}"

COMPOSE="docker compose --env-file $ENV_FILE -f infrastructure/production/docker-compose.yml"

# Preserve the current production state before any destructive action.
PRE_RESTORE_DIR="${BACKUP_DIR:-./backups}/pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$PRE_RESTORE_DIR"
BACKUP_DIR="$PRE_RESTORE_DIR" infrastructure/production/backup.sh "$ENV_FILE"

$COMPOSE stop api admin

# Restore database while application writers are stopped.
cat "$DB_BACKUP" | $COMPOSE exec -T postgres pg_restore \
  --clean --if-exists --no-owner --no-acl \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Restore the upload volume atomically from the operator-selected archive.
UPLOAD_ABS="$(cd "$(dirname "$UPLOAD_BACKUP")" && pwd)/$(basename "$UPLOAD_BACKUP")"
UPLOAD_DIR="$(dirname "$UPLOAD_ABS")"
UPLOAD_FILE="$(basename "$UPLOAD_ABS")"
docker run --rm \
  -v health-directory_upload_data:/data \
  -v "$UPLOAD_DIR:/backup:ro" \
  alpine:3.22 sh -eu -c "find /data -mindepth 1 -delete; tar -xzf /backup/$UPLOAD_FILE -C /data"

$COMPOSE up -d api admin caddy

# The API readiness endpoint verifies DB connectivity after restore.
tries=0
until $COMPOSE exec -T api node -e "fetch('http://127.0.0.1:3001/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; do
  tries=$((tries+1)); [ "$tries" -lt 20 ] || { echo "Restore completed but readiness did not recover." >&2; exit 1; }
  sleep 3
done

echo "Restore completed. Pre-restore safety backup: $PRE_RESTORE_DIR"
