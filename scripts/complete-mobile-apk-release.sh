#!/usr/bin/env bash
# After sarjan-textiles-app `npm run release:apk` — commit + push to prod.
# GitHub Actions (deploy-coolify.yml) then syncs APK to the VPS volume automatically.
# Mac SCP is NOT required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MANIFEST="public/downloads/mobile-release.json"
APK="public/downloads/sarjan-textiles.apk"
VERSION_FILE="public/downloads/sarjan-textiles.apk.version"

if [[ ! -f "$MANIFEST" || ! -f "$APK" ]]; then
  echo "Missing APK or manifest. Run npm run release:apk in sarjan-textiles-app first." >&2
  exit 1
fi

VERSION="$(python3 -c "import json; print(json.load(open('$MANIFEST'))['latestVersion'])")"
CODE="$(python3 -c "import json; print(json.load(open('$MANIFEST'))['versionCode'])")"

git add -f "$MANIFEST" "$APK" "$VERSION_FILE" 2>/dev/null || true
git add "$MANIFEST" "$VERSION_FILE" 2>/dev/null || true

if git diff --cached --quiet; then
  echo "No APK/manifest changes to commit."
else
  git commit -m "chore: publish mobile APK v${VERSION} (versionCode ${CODE})"
fi

echo "Pushing to origin prod (triggers Coolify deploy + VPS APK sync)…"
git push origin HEAD:prod

echo ""
echo "Done. GitHub Actions will:"
echo "  1. Deploy the site on Coolify"
echo "  2. Run scripts/vps/sync-mobile-apk.sh on the VPS (downloads APK from GitHub)"
echo ""
echo "Download: https://sarjantextiles.com/download"
echo "APK API:  https://sarjantextiles.com/api/download/apk"
