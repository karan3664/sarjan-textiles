#!/usr/bin/env bash
# Install Sarjan cron jobs on Hostinger VPS (replaces Vercel cron).
#
# Usage (VPS root):
#   bash /root/install-cron.sh
# Or with explicit secret:
#   CRON_SECRET=... SITE_URL=https://sarjantextiles.com bash install-cron.sh

set -euo pipefail

SITE_URL="${SITE_URL:-https://sarjantextiles.com}"
CRON_FILE="/etc/cron.d/sarjan"
COOLIFY_ENV="${COOLIFY_ENV:-/data/coolify/applications/r13sctp202kmjtniw1tudkix/.env}"

log() { echo "[sarjan-cron] $*"; }
die() { echo "[sarjan-cron] ERROR: $*" >&2; exit 1; }

if [[ -z "${CRON_SECRET:-}" && -f "$COOLIFY_ENV" ]]; then
  CRON_SECRET="$(grep -E '^CRON_SECRET=' "$COOLIFY_ENV" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi
[[ -n "${CRON_SECRET:-}" ]] || die "CRON_SECRET not set. Export it or set COOLIFY_ENV."

umask 077
cat >"$CRON_FILE" <<EOF
# Sarjan Textiles — managed by scripts/vps/install-cron.sh
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 2 * * * root curl -fsS -H "X-Cron-Secret: ${CRON_SECRET}" ${SITE_URL}/api/cron/daily-backup
0 * * * * root curl -fsS -H "X-Cron-Secret: ${CRON_SECRET}" ${SITE_URL}/api/cron/abandoned-cart-reminders
0 10 * * * root curl -fsS -H "X-Cron-Secret: ${CRON_SECRET}" ${SITE_URL}/api/cron/review-reminders
* * * * * root curl -fsS -H "X-Cron-Secret: ${CRON_SECRET}" ${SITE_URL}/api/cron/launch-newsletter
EOF

chmod 644 "$CRON_FILE"
log "Wrote $CRON_FILE"
log "Jobs: daily-backup (02:00), abandoned-cart (hourly), review-reminders (10:00), launch-newsletter (every minute)"
log "Verify: grep -v CRON_SECRET $CRON_FILE"
