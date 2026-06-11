#!/usr/bin/env bash
# Run ON the VPS (Hostinger Web Terminal or SSH) to print the uploads volume path.
# Copy the output into .env.local on your Mac:
#   REMOTE_UPLOADS_DIR=/data/coolify/applications/.../public/uploads
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

if path="$(discover)"; then
  echo "REMOTE_UPLOADS_DIR=$path"
  echo ""
  echo "Add the line above to sarjan-textiles/.env.local on your Mac, then run:"
  echo "  npm run cms:sync-uploads"
else
  echo "Could not auto-detect uploads directory." >&2
  echo "In Coolify → Sarjan app → Persistent Storage, confirm mount:" >&2
  echo "  Container: /app/public/uploads" >&2
  echo "Then list host paths:" >&2
  echo "  find /data/coolify -type d -name uploads 2>/dev/null" >&2
  exit 1
fi
