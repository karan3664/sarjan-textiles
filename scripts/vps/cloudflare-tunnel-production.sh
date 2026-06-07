#!/usr/bin/env bash
# Permanent public access when Hostinger blocks external 80/443.
#
# PREREQUISITES (you do once in browser):
#   1. cloudflare.com → Add site sarjantextiles.com
#   2. GoDaddy → change nameservers to Cloudflare's (2 nameservers)
#   3. Wait until Cloudflare shows domain Active
#   4. Cloudflare Zero Trust → Networks → Tunnels → Create tunnel
#      OR run this script after: cloudflared tunnel login
#
# On VPS Web Terminal as root:
#   bash cloudflare-tunnel-production.sh
#
set -euo pipefail

DOMAIN="${DOMAIN:-sarjantextiles.com}"
TUNNEL_NAME="${TUNNEL_NAME:-sarjan-textiles}"
ORIGIN="${ORIGIN:-http://127.0.0.1:80}"

if ! command -v cloudflared >/dev/null 2>&1; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
  dpkg -i /tmp/cloudflared.deb
fi

mkdir -p /etc/cloudflared

if [[ ! -f /etc/cloudflared/cert.pem ]]; then
  echo "Run: cloudflared tunnel login"
  echo "Open the URL it prints, authorize, then re-run this script."
  cloudflared tunnel login
fi

if ! cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
  cloudflared tunnel create "$TUNNEL_NAME"
fi

TUNNEL_ID=$(cloudflared tunnel list | awk -v n="$TUNNEL_NAME" '$0 ~ n {print $1; exit}')
CREDS="/etc/cloudflared/${TUNNEL_ID}.json"

cat >/etc/cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDS}

ingress:
  - hostname: ${DOMAIN}
    service: ${ORIGIN}
  - hostname: www.${DOMAIN}
    service: ${ORIGIN}
  - service: http_status:404
EOF

cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN" || true
cloudflared tunnel route dns "$TUNNEL_NAME" "www.$DOMAIN" || true

cloudflared service install
systemctl enable cloudflared
systemctl restart cloudflared
systemctl status cloudflared --no-pager | head -15

echo ""
echo "Done. Test in 2-5 min: https://${DOMAIN}"
echo "Cloudflare SSL/TLS mode: Full (not Strict) if origin uses self-signed."
