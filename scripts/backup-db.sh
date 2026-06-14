#!/usr/bin/env bash
# Postgres backup script for AMW EMS production.
#
# Usage (manual):
#   ./scripts/backup-db.sh
#
# Usage (cron — runs daily at 02:00):
#   0 2 * * * /opt/amw/scripts/backup-db.sh >> /var/log/amw-backup.log 2>&1
#
# Environment variables (read from .env.prod if present, else from shell):
#   POSTGRES_USER       DB user            (default: amw)
#   POSTGRES_PASSWORD   DB password        (required)
#   POSTGRES_DB         Database name      (default: performance_eval)
#   POSTGRES_HOST       Host               (default: localhost)
#   POSTGRES_PORT       Port               (default: 5432)
#   BACKUP_DIR          Where to write backups  (default: /opt/amw/backups)
#   BACKUP_KEEP_DAYS    Days to retain backups  (default: 30)
#   BACKUP_S3_BUCKET    Optional S3 bucket for offsite copy (e.g. s3://my-bucket/amw)

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
ENV_FILE="${ENV_FILE:-/opt/amw/.env.prod}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

PGUSER="${POSTGRES_USER:-amw}"
PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
PGDATABASE="${POSTGRES_DB:-performance_eval}"
PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/opt/amw/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

export PGPASSWORD

# ── Prepare ───────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="${PGDATABASE}_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "[$(date -Iseconds)] Starting backup → ${FILEPATH}"

# ── Dump ──────────────────────────────────────────────────────────────────────
pg_dump \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --no-owner \
  --no-acl \
  --format=plain \
  "$PGDATABASE" \
  | gzip -9 > "$FILEPATH"

SIZE=$(du -sh "$FILEPATH" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${FILENAME} (${SIZE})"

# ── Offsite copy to S3 (optional) ─────────────────────────────────────────────
if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  echo "[$(date -Iseconds)] Uploading to ${BACKUP_S3_BUCKET}…"
  aws s3 cp "$FILEPATH" "${BACKUP_S3_BUCKET}/${FILENAME}" --storage-class STANDARD_IA
  echo "[$(date -Iseconds)] S3 upload done"
fi

# ── Prune old local backups ───────────────────────────────────────────────────
echo "[$(date -Iseconds)] Pruning backups older than ${BACKUP_KEEP_DAYS} days"
find "$BACKUP_DIR" -name "${PGDATABASE}_*.sql.gz" -mtime "+${BACKUP_KEEP_DAYS}" -delete

REMAINING=$(find "$BACKUP_DIR" -name "${PGDATABASE}_*.sql.gz" | wc -l)
echo "[$(date -Iseconds)] Backup complete. ${REMAINING} backups retained in ${BACKUP_DIR}"
