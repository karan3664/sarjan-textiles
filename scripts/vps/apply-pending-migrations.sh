#!/usr/bin/env bash
# Apply new SQL migrations to VPS Postgres (sarjan-postgres or Coolify Postgres).
# Tracks applied files in schema_migrations — safe to re-run.
#
# On VPS (Hostinger Web Terminal or SSH):
#   curl -fsSL https://raw.githubusercontent.com/karan3664/sarjan-textiles/prod/scripts/vps/apply-pending-migrations.sh -o /root/apply-pending-migrations.sh
#   bash /root/apply-pending-migrations.sh
#
# Coolify Postgres (auto-detected unless PG_CONTAINER is set):
#   PG_CONTAINER=pha6nt73jr0ru3ua1t5glfjo bash /root/apply-pending-migrations.sh

set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-}"
REPO_URL="${REPO_URL:-https://github.com/karan3664/sarjan-textiles.git}"
REPO_BRANCH="${REPO_BRANCH:-prod}"
CREDS_FILE="/root/sarjan-db-credentials.env"

log() { echo "[sarjan-migrate] $*"; }
die() { echo "[sarjan-migrate] ERROR: $*" >&2; exit 1; }

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
docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER" || die "container $PG_CONTAINER not running"

if [[ -f "$CREDS_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CREDS_FILE"
fi

DB_USER="${DB_USER:-$(read_container_env POSTGRES_USER)}"
DB_NAME="${DB_NAME:-$(read_container_env POSTGRES_DB)}"
[[ -n "$DB_USER" ]] || DB_USER="postgres"
[[ -n "$DB_NAME" ]] || DB_NAME="sarjan_textiles"
if [[ "$DB_NAME" == "postgres" ]]; then
  if docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='sarjan_textiles'" 2>/dev/null | grep -q 1; then
    DB_NAME="sarjan_textiles"
  fi
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
  MIGRATIONS_DIR="$clone_dir/db/migrations"
  [[ -d "$MIGRATIONS_DIR" ]] || die "No db/migrations in cloned repo"
}

resolve_migrations

log "Container: $PG_CONTAINER"
log "Database:  $DB_USER@$DB_NAME"

log "Ensuring schema_migrations table ..."
docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <<'SQL'
create table if not exists public.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
SQL

applied=0
skipped=0

while IFS= read -r f; do
  base="$(basename "$f")"
  exists="$(docker exec "$PG_CONTAINER" psql -tAc \
    "select 1 from schema_migrations where filename = '$base' limit 1;" \
    -U "$DB_USER" -d "$DB_NAME" | tr -d '[:space:]')"
  if [[ "$exists" == "1" ]]; then
    log "skip (already applied): $base"
    skipped=$((skipped + 1))
    continue
  fi
  if [[ "$base" == "20260509203100_seed_core.sql" ]]; then
    client_count="$(docker exec "$PG_CONTAINER" psql -tAc \
      "select count(*)::text from clients;" -U "$DB_USER" -d "$DB_NAME" | tr -d '[:space:]')"
    if [[ "${client_count:-0}" != "0" ]]; then
      log "skip seed (clients already populated: ${client_count} rows)"
      docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
        -c "insert into schema_migrations (filename) values ('$base') on conflict do nothing;"
      skipped=$((skipped + 1))
      continue
    fi
  fi
  log "apply: $base"
  docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <"$f"
  docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "insert into schema_migrations (filename) values ('$base');"
  applied=$((applied + 1))
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | sort)

log "Done. applied=$applied skipped=$skipped"
log "Verify AI + review tables:"
docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "select to_regclass('public.product_reviews') as product_reviews,
          to_regclass('public.client_notifications') as client_notifications,
          to_regclass('public.client_saved_lists') as client_saved_lists,
          to_regclass('public.ai_chat_sessions') as ai_chat_sessions,
          to_regclass('public.ai_leads') as ai_leads,
          to_regclass('public.ai_user_interests') as ai_user_interests,
          to_regclass('public.ai_user_recommendations') as ai_user_recommendations;"
