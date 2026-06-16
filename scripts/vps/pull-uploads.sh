#!/usr/bin/env bash
# Pull live VPS uploads (images/videos) → local public/uploads for dev frontend.
# Run from sarjan-textiles repo root:
#   npm run cms:pull-uploads
#
# Opposite of cms:sync-uploads (which pushes local → live).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

load_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -n "$line" && "$line" == *=* ]] || continue
    key="${line%%=*}"
    value="${line#*=}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    if [[ -z "${!key:-}" ]]; then
      export "$key=$value"
    fi
  done <"$ENV_FILE"
}

load_env

LOCAL_UPLOADS="${LOCAL_UPLOADS:-$ROOT/public/uploads}"
VPS_HOST="${VPS_HOST:-69.62.77.149}"
VPS_USER="${VPS_USER:-root}"
REMOTE_DIR="${REMOTE_UPLOADS_DIR:-}"

SSH_OPTS=(-o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new)
if [[ -n "${VPS_SSH_PRIVATE_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$VPS_SSH_PRIVATE_KEY")
  SSH_OPTS+=(-o BatchMode=yes)
fi

ssh_cmd() {
  ssh "${SSH_OPTS[@]}" "$VPS_USER@$VPS_HOST" "$@"
}

discover_remote_uploads() {
  ssh_cmd 'bash -s' <<'REMOTE'
set -euo pipefail
discover() {
  local cid src found base
  if command -v docker >/dev/null 2>&1; then
    for cid in $(docker ps -q 2>/dev/null); do
      src="$(docker inspect "$cid" --format '{{range .Mounts}}{{if eq .Destination "/app/public/uploads"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)"
      if [[ -n "$src" && -d "$src" ]]; then
        echo "$src"
        return 0
      fi
    done
  fi
  for base in /data/coolify /var/lib/coolify /root/coolify; do
    [[ -d "$base" ]] || continue
    found="$(find "$base" -type d -path '*/public/uploads' 2>/dev/null | head -1 || true)"
    if [[ -n "$found" && -d "$found" ]]; then
      echo "$found"
      return 0
    fi
  done
  return 1
}
discover || exit 1
REMOTE
}

if [[ -z "$REMOTE_DIR" ]]; then
  echo "Finding Coolify uploads volume on $VPS_USER@$VPS_HOST ..."
  if ! REMOTE_DIR="$(discover_remote_uploads 2>/dev/null)"; then
    echo "Could not find remote uploads dir. Set REMOTE_UPLOADS_DIR in .env.local" >&2
    exit 1
  fi
  echo "Found: $REMOTE_DIR"
fi

mkdir -p "$LOCAL_UPLOADS"

echo "Pulling $VPS_USER@$VPS_HOST:$REMOTE_DIR/ → $LOCAL_UPLOADS/"
rsync -avz --progress -e "ssh ${SSH_OPTS[*]}" "$VPS_USER@$VPS_HOST:$REMOTE_DIR/" "$LOCAL_UPLOADS/"
echo "Uploads pulled. Restart dev server if running: npm run dev"
