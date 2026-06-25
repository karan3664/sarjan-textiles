#!/usr/bin/env bash
# Post-deploy health check for any Sarjan environment.
# Usage:
#   BASE_URL=https://dev.sarjantextiles.com bash scripts/vps/health-check.sh
#   BASE_URL=https://sarjantextiles.com bash scripts/vps/health-check.sh

set -euo pipefail

BASE_URL="${BASE_URL:-https://sarjantextiles.com}"
BASE_URL="${BASE_URL%/}"

log() { echo "[health] $*"; }
fail() { echo "[health] FAIL: $*" >&2; exit 1; }

check() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl -fsS -o /tmp/sarjan-health-body.json -w "%{http_code}" "$url" || echo "000")"
  if [[ "$code" != "200" && "$code" != "204" ]]; then
    fail "$name returned HTTP $code ($url)"
  fi
  log "OK $name ($code)"
}

log "Checking $BASE_URL"

check "health_api" "$BASE_URL/api/health"
check "home" "$BASE_URL/"
check "api_products" "$BASE_URL/api/products?limit=1"

if command -v jq >/dev/null 2>&1; then
  status="$(jq -r '.status // empty' /tmp/sarjan-health-body.json 2>/dev/null || true)"
  env="$(jq -r '.env // empty' /tmp/sarjan-health-body.json 2>/dev/null || true)"
  log "API health status=$status env=$env"
  [[ "$status" == "ok" ]] || fail "health API status is not ok"
fi

log "All checks passed for $BASE_URL"
