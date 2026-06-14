#!/usr/bin/env bash
# Restore a gzip-compressed pg_dump backup.
#
# Usage:
#   ./scripts/restore-db.sh <backup-file.sql.gz>
#
# Example:
#   ./scripts/restore-db.sh /opt/amw/backups/performance_eval_20260613_020001.sql.gz
#
# WARNING: This drops and recreates the target database. Run only in an
# emergency / planned maintenance window.

set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 <backup-file.sql.gz>}"
[[ -f "$BACKUP_FILE" ]] || { echo "File not found: $BACKUP_FILE"; exit 1; }

ENV_FILE="${ENV_FILE:-/opt/amw/.env.prod}"
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE"; set +a
fi

PGUSER="${POSTGRES_USER:-amw}"
PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
PGDATABASE="${POSTGRES_DB:-performance_eval}"
PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"

export PGPASSWORD

echo "[$(date -Iseconds)] Restoring ${BACKUP_FILE} → ${PGDATABASE}"
echo "WARNING: This will DROP and recreate the database '${PGDATABASE}'."
read -r -p "Type 'yes' to confirm: " CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "Aborted."; exit 1; }

echo "[$(date -Iseconds)] Dropping and recreating database…"
psql --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" postgres <<SQL
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = '${PGDATABASE}' AND pid <> pg_backend_pid();
  DROP DATABASE IF EXISTS "${PGDATABASE}";
  CREATE DATABASE "${PGDATABASE}" OWNER "${PGUSER}";
SQL

echo "[$(date -Iseconds)] Restoring data…"
gunzip -c "$BACKUP_FILE" | psql \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE"

echo "[$(date -Iseconds)] Restore complete."
