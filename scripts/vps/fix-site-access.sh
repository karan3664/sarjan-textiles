#!/usr/bin/env bash
# Sarjan Textiles — fix Coolify/Traefik + verify site on VPS
# Run on Hostinger Web Terminal as root:
#   bash fix-site-access.sh
set -euo pipefail

log() { echo "[fix-site] $*"; }

log "=== 1. Remove stale exited app containers ==="
docker ps -a --filter "name=r13sctp" --filter "status=exited" -q | xargs -r docker rm -f
docker ps -a --filter "name=sarjan" --filter "status=exited" -q | xargs -r docker rm -f

log "=== 2. Restart reverse proxy ==="
docker restart coolify-proxy
sleep 5

log "=== 3. Running containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E 'r13sctp|coolify-proxy|NAME' || true

APP=$(docker ps --format '{{.Names}}' | grep r13sctp | head -1 || true)
if [[ -z "$APP" ]]; then
  log "ERROR: No running sarjan app container. Redeploy from Coolify first."
  exit 1
fi
log "App container: $APP"

log "=== 4. Traefik rule ==="
docker inspect "$APP" --format '{{json .Config.Labels}}' | tr ',' '\n' | grep '\.rule' || true

log "=== 5. Local proxy tests ==="
curl -sI --max-time 10 -H "Host: sarjantextiles.com" http://127.0.0.1/ | head -5 || true
echo "---"
curl -skI --max-time 10 -H "Host: sarjantextiles.com" https://127.0.0.1/ | head -8 || true
echo "---"
curl -skI --max-time 10 https://sarjantextiles.com | head -8 || true

log "=== 6. Proxy errors (last 8 lines) ==="
docker logs coolify-proxy --tail 8 2>&1 || true

log "=== 7. Listening ports ==="
ss -tlnp | grep -E ':80|:443' || true

log ""
log "If step 5 shows HTTP/2 200 but your Mac/browser still fails:"
log "  → Hostinger blocks external 80/443. Use Cloudflare (see docs/VPS-COOLIFY.md)"
log "  → Or open Hostinger support ticket for inbound ports 80/443"
