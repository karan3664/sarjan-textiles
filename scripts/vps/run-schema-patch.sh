#!/usr/bin/env bash
# Apply pending-schema-patch.sql to Coolify Postgres on Hostinger VPS.
#
# Usage (VPS root terminal):
#   curl -fsSL https://raw.githubusercontent.com/karan3664/sarjan-textiles/main/scripts/vps/run-schema-patch.sh -o /root/run-schema-patch.sh
#   bash /root/run-schema-patch.sh
#
# Or after git clone / scp:
#   bash scripts/vps/run-schema-patch.sh

set -euo pipefail

log() { echo "[sarjan-schema] $*"; }
die() { echo "[sarjan-schema] ERROR: $*" >&2; exit 1; }

command -v docker >/dev/null || die "docker not found"

# Coolify Sarjan DB — NOT coolify-db (that is Coolify panel only).
if [[ -z "${PG_CONTAINER:-}" ]]; then
  PG_CONTAINER="$(docker ps --format '{{.Names}}\t{{.Image}}' \
    | grep -i postgres \
    | grep -iv coolify-db \
    | awk '{print $1}' \
    | head -1)"
fi
[[ -n "$PG_CONTAINER" ]] || die "No Postgres container found. Set PG_CONTAINER=your-container-name"

DB_USER="${DB_USER:-$(docker inspect "$PG_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | sed -n 's/^POSTGRES_USER=//p' | head -1)}"
DB_NAME="${DB_NAME:-$(docker inspect "$PG_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | sed -n 's/^POSTGRES_DB=//p' | head -1)}"
[[ -n "$DB_USER" ]] || DB_USER="postgres"
[[ -n "$DB_NAME" ]] || DB_NAME="postgres"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SQL_FILE:-$SCRIPT_DIR/pending-schema-patch.sql}"
[[ -f "$SQL_FILE" ]] || die "SQL file not found: $SQL_FILE"

log "Container: $PG_CONTAINER"
log "Database:  $DB_USER@$DB_NAME"
log "Applying:  $SQL_FILE"

docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <"$SQL_FILE"

log "Done — retry Place Order in the app."
