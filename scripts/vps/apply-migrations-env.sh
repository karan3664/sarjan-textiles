#!/usr/bin/env bash
# Apply SQL migrations for a specific environment (dev / staging / production).
# Never run production migrations from feature branches.
#
# Usage on VPS:
#   APP_ENV=development REPO_BRANCH=development bash scripts/vps/apply-migrations-env.sh
#   APP_ENV=staging REPO_BRANCH=staging bash scripts/vps/apply-migrations-env.sh
#   APP_ENV=production REPO_BRANCH=prod bash scripts/vps/apply-migrations-env.sh

set -euo pipefail

APP_ENV="${APP_ENV:-production}"
REPO_BRANCH="${REPO_BRANCH:-prod}"
CREDS_FILE="${CREDS_FILE:-/root/sarjan-db-credentials.env}"

case "$APP_ENV" in
  development|dev)
    APP_ENV=development
    REPO_BRANCH="${REPO_BRANCH:-development}"
    PG_CONTAINER="${PG_CONTAINER:-sarjan-dev-postgres}"
  ;;
  staging|stage)
    APP_ENV=staging
    REPO_BRANCH="${REPO_BRANCH:-staging}"
    PG_CONTAINER="${PG_CONTAINER:-sarjan-staging-postgres}"
  ;;
  production|prod)
    APP_ENV=production
    REPO_BRANCH="${REPO_BRANCH:-prod}"
    PG_CONTAINER="${PG_CONTAINER:-sarjan-postgres}"
  ;;
  *)
    echo "Unknown APP_ENV=$APP_ENV (use development|staging|production)" >&2
    exit 1
  ;;
esac

if [[ "$APP_ENV" == "production" && "${ALLOW_PROD_MIGRATE:-}" != "1" ]]; then
  echo "[migrate] Production migrations require ALLOW_PROD_MIGRATE=1" >&2
  exit 1
fi

export PG_CONTAINER
export REPO_BRANCH

if [[ -f "${CREDS_FILE}.${APP_ENV}" ]]; then
  CREDS_FILE="${CREDS_FILE}.${APP_ENV}"
fi

echo "[migrate] APP_ENV=$APP_ENV branch=$REPO_BRANCH container=$PG_CONTAINER"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/apply-pending-migrations.sh"
