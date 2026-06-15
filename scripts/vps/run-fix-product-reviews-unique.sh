#!/usr/bin/env bash
# Apply fix-product-reviews-unique.sql via Docker Postgres (Hostinger / Coolify VPS).
#
# Usage on VPS (no host psql required):
#   curl -fsSL https://raw.githubusercontent.com/karan3664/sarjan-textiles/prod/scripts/vps/run-fix-product-reviews-unique.sh -o /root/run-fix-product-reviews-unique.sh
#   bash /root/run-fix-product-reviews-unique.sh
#
# Or with explicit container (Coolify Postgres service name):
#   PG_CONTAINER=pha6nt73jr0ru3ua1t5glfjo bash /root/run-fix-product-reviews-unique.sh

set -euo pipefail

log() { echo "[sarjan-reviews-unique] $*"; }
die() { echo "[sarjan-reviews-unique] ERROR: $*" >&2; exit 1; }

command -v docker >/dev/null || die "docker not found"

read_container_env() {
  local key="$1"
  docker inspect "$PG_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | sed -n "s/^${key}=//p" | head -1
}

CONTAINER_NAME="${CONTAINER_NAME:-}"
PG_CONTAINER="${PG_CONTAINER:-$CONTAINER_NAME}"

if [[ -z "$PG_CONTAINER" ]]; then
  if docker ps --format '{{.Names}}' | grep -qx sarjan-postgres; then
    PG_CONTAINER=sarjan-postgres
  else
    PG_CONTAINER="$(docker ps --format '{{.Names}}\t{{.Image}}' \
      | grep -i postgres \
      | grep -iv coolify-db \
      | awk '{print $1}' \
      | head -1)"
  fi
fi
[[ -n "$PG_CONTAINER" ]] || die "No Postgres container found. Set PG_CONTAINER=your-container-name"

if [[ -f /root/sarjan-db-credentials.env ]]; then
  # shellcheck disable=SC1091
  source /root/sarjan-db-credentials.env
  DB_USER="${DB_USER:-}"
  DB_NAME="${DB_NAME:-}"
fi

DB_USER="${DB_USER:-$(read_container_env POSTGRES_USER)}"
DB_NAME="${DB_NAME:-$(read_container_env POSTGRES_DB)}"
[[ -n "$DB_USER" ]] || DB_USER="postgres"
[[ -n "$DB_NAME" ]] || DB_NAME="sarjan_textiles"
# Coolify often sets POSTGRES_DB=postgres; app data lives in sarjan_textiles.
if [[ "$DB_NAME" == "postgres" ]]; then
  if docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='sarjan_textiles'" 2>/dev/null | grep -q 1; then
    DB_NAME="sarjan_textiles"
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SQL_FILE:-$SCRIPT_DIR/fix-product-reviews-unique.sql}"

if [[ ! -f "$SQL_FILE" ]]; then
  log "Downloading SQL from GitHub prod branch ..."
  curl -fsSL \
    https://raw.githubusercontent.com/karan3664/sarjan-textiles/prod/scripts/vps/fix-product-reviews-unique.sql \
    -o /tmp/fix-product-reviews-unique.sql
  SQL_FILE=/tmp/fix-product-reviews-unique.sql
fi

log "Container: $PG_CONTAINER"
log "Database:  $DB_USER@$DB_NAME"
log "Applying:  $SQL_FILE"

docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <"$SQL_FILE"

log "Done — one review per order line (order_id + product_slug + client_id)."
