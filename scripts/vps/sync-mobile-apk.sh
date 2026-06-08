#!/usr/bin/env bash
# Copy mobile APK onto Coolify persistent /app/public/downloads volume.
# Run on VPS (or via GitHub Actions SSH after deploy).
set -euo pipefail

MANIFEST_URL="${MANIFEST_URL:-https://raw.githubusercontent.com/karan3664/sarjan-textiles/main/public/downloads/mobile-release.json}"
TMP_MANIFEST="$(mktemp)"
trap 'rm -f "$TMP_MANIFEST"' EXIT

curl -fsSL "$MANIFEST_URL" -o "$TMP_MANIFEST"
APK_FILE="$(python3 -c "import json; print(json.load(open('$TMP_MANIFEST'))['apkFile'])")"
APK_SOURCE="$(python3 -c "import json; m=json.load(open('$TMP_MANIFEST')); print(m.get('apkSourceUrl') or '')")"

if [ -z "$APK_SOURCE" ]; then
  echo "mobile-release.json missing apkSourceUrl — cannot download APK." >&2
  exit 1
fi

DOWNLOADS_DIR="${SARJAN_DOWNLOADS_DIR:-}"
if [ -z "$DOWNLOADS_DIR" ]; then
  DOWNLOADS_DIR="$(find /data/coolify -type d -path '*/public/downloads' 2>/dev/null | head -1 || true)"
fi
if [ -z "$DOWNLOADS_DIR" ]; then
  DOWNLOADS_DIR="/root/sarjan-apk-downloads"
fi

mkdir -p "$DOWNLOADS_DIR"
DEST="$DOWNLOADS_DIR/$APK_FILE"
echo "Downloading $APK_SOURCE -> $DEST"
curl -fsSL "$APK_SOURCE" -o "$DEST.tmp"
mv "$DEST.tmp" "$DEST"
chmod 644 "$DEST"
ls -lh "$DEST"
echo "APK synced to $DEST"
