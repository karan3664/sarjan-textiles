#!/usr/bin/env bash
# Upload ONLY public/bimi/logo.svg to the running production container.
# Does not deploy application code or trigger Coolify rebuild.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOGO="$ROOT/public/bimi/logo.svg"
VPS_HOST="${VPS_HOST:-69.62.77.149}"
VPS_USER="${VPS_USER:-root}"
SSH_KEY="${VPS_SSH_PRIVATE_KEY:-$HOME/.ssh/id_ed25519}"

if [[ ! -f "$LOGO" ]]; then
  echo "Missing $LOGO — create the BIMI SVG first." >&2
  exit 1
fi

SSH_OPTS=(-o BatchMode=yes)
if [[ -f "$SSH_KEY" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY")
fi

if [[ -z "${CONTAINER:-}" ]]; then
  echo "Finding production app container on $VPS_USER@$VPS_HOST ..."
  CONTAINER="$(
    ssh "${SSH_OPTS[@]}" "$VPS_USER@$VPS_HOST" \
      "docker ps --format '{{.Names}}' | grep -Ei 'sarjan|textiles|coolify' | head -1"
  )"
fi

if [[ -z "${CONTAINER:-}" ]]; then
  echo "Could not find container. Run with CONTAINER=<name> bash scripts/vps/deploy-bimi-logo.sh" >&2
  exit 1
fi

echo "Using container: $CONTAINER"
ssh "${SSH_OPTS[@]}" "$VPS_USER@$VPS_HOST" "docker exec '$CONTAINER' mkdir -p /app/public/bimi"
scp "${SSH_OPTS[@]}" "$LOGO" "$VPS_USER@$VPS_HOST:/tmp/sarjan-bimi-logo.svg"
ssh "${SSH_OPTS[@]}" "$VPS_USER@$VPS_HOST" \
  "docker cp /tmp/sarjan-bimi-logo.svg '$CONTAINER':/app/public/bimi/logo.svg && rm -f /tmp/sarjan-bimi-logo.svg"

echo "Deployed BIMI logo only."
echo "Verify: https://sarjantextiles.com/bimi/logo.svg"
