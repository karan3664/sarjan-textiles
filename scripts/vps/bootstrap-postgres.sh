#!/usr/bin/env bash
# Sarjan Textiles — PostgreSQL on Hostinger VPS (Coolify Docker network)
# Run as root on the VPS (Hostinger Web Terminal or SSH):
#   bash bootstrap-postgres.sh
#
# Optional env:
#   MIGRATIONS_DIR=/root/migrations   — use existing SQL files
#   REPO_URL=https://github.com/USER/sarjan-textiles.git
#   REPO_BRANCH=development
#   DB_NAME=sarjan_textiles
#   DB_USER=sarjan

set -euo pipefail

DB_NAME="${DB_NAME:-sarjan_textiles}"
DB_USER="${DB_USER:-sarjan}"
CONTAINER_NAME="${CONTAINER_NAME:-sarjan-postgres}"
CREDS_FILE="/root/sarjan-db-credentials.env"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-/root/migrations}"

log() { echo "[sarjan] $*"; }
die() { echo "[sarjan] ERROR: $*" >&2; exit 1; }

command -v docker >/dev/null || die "docker not found — install Coolify first"

# Coolify apps use the same Docker network as the coolify container.
NETWORK="$(docker inspect coolify --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null | awk '{print $1}')"
[[ -n "$NETWORK" ]] || die "coolify container/network not found — is Coolify running?"

if [[ -f "$CREDS_FILE" ]] && docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  log "Postgres container already exists. Loading credentials from $CREDS_FILE"
  # shellcheck disable=SC1090
  source "$CREDS_FILE"
else
  DB_PASS="$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
  docker volume create sarjan-pg-data >/dev/null 2>&1 || true
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    log "Removing old stopped container $CONTAINER_NAME"
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
  log "Starting PostgreSQL 16 on network=$NETWORK ..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    --network "$NETWORK" \
    --restart unless-stopped \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    -v sarjan-pg-data:/var/lib/postgresql/data \
    postgres:16-alpine

  cat >"$CREDS_FILE" <<EOF
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASS=$DB_PASS
CONTAINER_NAME=$CONTAINER_NAME
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${CONTAINER_NAME}:5432/${DB_NAME}
EOF
  chmod 600 "$CREDS_FILE"
fi

# shellcheck disable=SC1090
source "$CREDS_FILE"

log "Waiting for Postgres to accept connections ..."
for i in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  [[ "$i" -eq 30 ]] && die "Postgres did not become ready in time"
done

resolve_migrations() {
  if [[ -d "$MIGRATIONS_DIR" ]] && ls "$MIGRATIONS_DIR"/*.sql >/dev/null 2>&1; then
    log "Using migrations in $MIGRATIONS_DIR"
    return 0
  fi
  if [[ -n "${REPO_URL:-}" ]]; then
    local clone_dir="/tmp/sarjan-migrations-$$"
    log "Cloning $REPO_URL (branch ${REPO_BRANCH:-development}) ..."
    rm -rf "$clone_dir"
    git clone --depth 1 -b "${REPO_BRANCH:-development}" "$REPO_URL" "$clone_dir"
    MIGRATIONS_DIR="$clone_dir/supabase/migrations"
    [[ -d "$MIGRATIONS_DIR" ]] || die "No supabase/migrations in cloned repo"
    return 0
  fi
  die "No migrations found. Either:\n  scp -r supabase/migrations root@VPS:/root/migrations/\n  or: REPO_URL=https://github.com/you/sarjan-textiles.git bash bootstrap-postgres.sh"
}

resolve_migrations

log "Applying SQL migrations (sorted) ..."
while IFS= read -r f; do
  log "  -> $(basename "$f")"
  docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <"$f"
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | sort)

log "Table counts:"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT 'clients' AS t, count(*)::text FROM clients
   UNION ALL SELECT 'orders', count(*)::text FROM orders
   UNION ALL SELECT 'cms_snapshots', count(*)::text FROM cms_snapshots;"

echo ""
echo "=============================================="
echo " PostgreSQL ready for Sarjan Textiles"
echo "=============================================="
echo "Credentials saved: $CREDS_FILE"
echo ""
echo "DATABASE_URL (use in Coolify app env):"
echo "  $DATABASE_URL"
echo ""
echo "Next: Coolify → New Application → GitHub sarjan-textiles"
echo "      Paste env from docs/VPS-COOLIFY.md"
echo "=============================================="
