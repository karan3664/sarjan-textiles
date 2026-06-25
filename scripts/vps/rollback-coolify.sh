#!/usr/bin/env bash
# Rollback Coolify deployment to previous image (one-click recovery).
# Requires COOLIFY_API_TOKEN and COOLIFY_APP_UUID in environment.
#
# Usage:
#   COOLIFY_APP_UUID=xxx COOLIFY_API_TOKEN=yyy bash scripts/vps/rollback-coolify.sh

set -euo pipefail

COOLIFY_API_URL="${COOLIFY_API_URL:-http://127.0.0.1:8000/api/v1}"
COOLIFY_APP_UUID="${COOLIFY_APP_UUID:?Set COOLIFY_APP_UUID}"
COOLIFY_API_TOKEN="${COOLIFY_API_TOKEN:?Set COOLIFY_API_TOKEN}"

log() { echo "[rollback] $*"; }
die() { echo "[rollback] ERROR: $*" >&2; exit 1; }

log "Fetching deployments for $COOLIFY_APP_UUID"
deployments="$(curl -fsS \
  -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
  "$COOLIFY_API_URL/applications/$COOLIFY_APP_UUID/deployments" \
  || die "Could not list deployments")"

# Coolify API shape may vary by version — try common rollback: redeploy previous successful deployment
prev_id="$(echo "$deployments" | python3 -c "
import json,sys
try:
  data=json.load(sys.stdin)
  items=data if isinstance(data,list) else data.get('deployments',data.get('data',[]))
  ok=[d for d in items if str(d.get('status','')).lower() in ('finished','success','completed')]
  if len(ok)<2:
    print('')
  else:
    print(ok[1].get('uuid', ok[1].get('id','')))
except Exception:
  print('')
" 2>/dev/null || true)"

if [[ -z "$prev_id" ]]; then
  die "No previous deployment found to rollback. Use Coolify UI → Deployments → Redeploy previous."
fi

log "Rolling back to deployment $prev_id"
curl -fsS -X POST \
  -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
  "$COOLIFY_API_URL/deployments/$prev_id/rollback" \
  && log "Rollback triggered." \
  || die "Rollback API call failed — use Coolify UI manually."
