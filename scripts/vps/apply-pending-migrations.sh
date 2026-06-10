#!/usr/bin/env bash
# Apply new SQL migrations to VPS Postgres (sarjan-postgres container).
# Tracks applied files in schema_migrations — safe to re-run.
#
# On VPS (Hostinger Web Terminal or SSH):
#   bash /root/apply-pending-migrations.sh
#
# Or clone from GitHub:
#   curl -fsSL https://raw.githubusercontent.com/karan3664/sarjan-textiles/development/scripts/vps/apply-pending-migrations.sh -o /root/apply-pending-migrations.sh
#   REPO_URL=https://github.com/karan3664/sarjan-textiles.git REPO_BRANCH=development bash /root/apply-pending-migrations.sh

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-sarjan-postgres}"
DB_USER="${DB_USER:-sarjan}"
DB_NAME="${DB_NAME:-sarjan_textiles}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-}"
REPO_URL="${REPO_URL:-https://github.com/karan3664/sarjan-textiles.git}"
REPO_BRANCH="${REPO_BRANCH:-development}"
CREDS_FILE="/root/sarjan-db-credentials.env"

log() { echo "[sarjan-migrate] $*"; }
die() { echo "[sarjan-migrate] ERROR: $*" >&2; exit 1; }

command -v docker >/dev/null || die "docker not found"
docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME" || die "container $CONTAINER_NAME not running"

if [[ -f "$CREDS_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CREDS_FILE"
fi

resolve_migrations() {
  if [[ -n "$MIGRATIONS_DIR" && -d "$MIGRATIONS_DIR" ]]; then
    return 0
  fi
  if [[ -d /root/migrations ]] && ls /root/migrations/*.sql >/dev/null 2>&1; then
    MIGRATIONS_DIR=/root/migrations
    return 0
  fi
  local clone_dir="/tmp/sarjan-migrations-$$"
  log "Cloning $REPO_URL (branch $REPO_BRANCH) ..."
  rm -rf "$clone_dir"
  git clone --depth 1 -b "$REPO_BRANCH" "$REPO_URL" "$clone_dir"
  MIGRATIONS_DIR="$clone_dir/supabase/migrations"
  [[ -d "$MIGRATIONS_DIR" ]] || die "No supabase/migrations in cloned repo"
}

resolve_migrations

log "Ensuring schema_migrations table ..."
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <<'SQL'
create table if not exists public.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
SQL

applied=0
skipped=0

while IFS= read -r f; do
  base="$(basename "$f")"
  exists="$(docker exec "$CONTAINER_NAME" psql -tAc \
    "select 1 from schema_migrations where filename = '$base' limit 1;" \
    -U "$DB_USER" -d "$DB_NAME" | tr -d '[:space:]')"
  if [[ "$exists" == "1" ]]; then
    log "skip (already applied): $base"
    skipped=$((skipped + 1))
    continue
  fi
  log "apply: $base"
  docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <"$f"
  docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "insert into schema_migrations (filename) values ('$base');"
  applied=$((applied + 1))
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | sort)

log "Done. applied=$applied skipped=$skipped"
log "Verify product_reviews:"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "select to_regclass('public.product_reviews') as product_reviews,
          to_regclass('public.client_notifications') as client_notifications,
          to_regclass('public.client_saved_lists') as client_saved_lists;"
