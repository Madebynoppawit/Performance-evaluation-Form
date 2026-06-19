#!/usr/bin/env bash
#
# One-shot production deploy for v1.4.3.
#   1. prisma migrate deploy           (adds template/evaluation scoring weight columns — idempotent)
#   2. reissue-temp-passwords.cjs      (replaces the shared default password with per-user temp passwords)
#
# Run from the backend/ directory on a host whose DATABASE_URL points at PRODUCTION:
#   ./scripts/deploy-v1.4.3.sh              # interactive (asks before the password reissue)
#   ./scripts/deploy-v1.4.3.sh --yes        # non-interactive (CI) — skips the confirm prompt
#   ./scripts/deploy-v1.4.3.sh --skip-build # DB already migrated & dist/ already built
#
# Safety: refuses to run if DATABASE_URL points at localhost/127.0.0.1 (the local dev DB),
# unless you explicitly pass --allow-local.
set -euo pipefail

ASSUME_YES=0
SKIP_BUILD=0
ALLOW_LOCAL=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y)      ASSUME_YES=1 ;;
    --skip-build)  SKIP_BUILD=1 ;;
    --allow-local) ALLOW_LOCAL=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

# Resolve backend/ as the working directory regardless of where the script was invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Load DATABASE_URL from .env if it is not already exported.
if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "✗ DATABASE_URL is not set (env or backend/.env). Aborting." >&2
  exit 1
fi

# Guard: never touch the local dev DB unless explicitly overridden.
if printf '%s' "$DATABASE_URL" | grep -Eq 'localhost|127\.0\.0\.1'; then
  if [ "$ALLOW_LOCAL" -ne 1 ]; then
    echo "✗ DATABASE_URL points at localhost — this looks like the dev DB, not prod." >&2
    echo "  Refusing to reset passwords on a local database. Pass --allow-local to override." >&2
    exit 1
  fi
  echo "⚠️  Proceeding against a LOCAL database (--allow-local given)."
fi

# Mask credentials when echoing the target.
MASKED="$(printf '%s' "$DATABASE_URL" | sed -E 's#(://[^:]+):[^@]+@#\1:****@#')"
echo "==> Target database: $MASKED"
echo

if [ "$SKIP_BUILD" -ne 1 ]; then
  echo "==> Installing deps + building (dist/ is required by the reissue script)…"
  npm ci
  npm run build
  echo
fi

echo "==> Step 1/2: prisma migrate deploy"
npx prisma migrate deploy
echo

echo "==> Step 2/2: re-issue per-user temporary passwords"
echo "    Counting affected users first (no changes yet)…"
node scripts/reissue-temp-passwords.cjs --dry-run
echo

if [ "$ASSUME_YES" -ne 1 ]; then
  printf "Proceed to RESET these users' passwords and write a credentials CSV? [y/N] "
  read -r reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *) echo "Aborted before reissue. Migration (step 1) is already applied."; exit 0 ;;
  esac
fi

OUT="temp-credentials-$(date +%Y-%m-%d).csv"
node scripts/reissue-temp-passwords.cjs --out "$OUT"
echo
echo "✓ Deploy steps complete."
echo "  Credentials written to: backend/$OUT"
echo "  → Distribute via a secure channel, then DELETE the file. Users must change password on first login."
