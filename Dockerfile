# Sarjan Textiles — production image for Coolify / Docker.
# Tuned for 2GB VPS: standalone runner (no full node_modules COPY), single build worker.

FROM node:22.13-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
# npm ci is mostly I/O; keep heap small so native alloc + apt don't OOM 2GB hosts.
ENV NODE_OPTIONS=--max-old-space-size=768
# Single compile worker — parallel webpack workers OOM small VPS Docker builds.
ENV NEXT_PRIVATE_BUILD_WORKER=0
ARG SITE_LAUNCH_AT
ENV SITE_LAUNCH_AT=${SITE_LAUNCH_AT}
ARG NEXT_PUBLIC_SITE_URL=https://sarjantextiles.com
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

COPY . .
# 2GB VPS: 1280MB heap + Docker overhead often triggers OOM kill (exit 255) mid-build.
ENV NODE_OPTIONS=--max-old-space-size=896
ENV GENERATE_SOURCEMAP=false
RUN npm run build:docker && rm -rf .next/cache

FROM node:22.13-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone trace — much smaller than copying full .next + node_modules (export OOM fix).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Runtime fs read in buildTaxInvoiceHtml (belt-and-suspenders if trace misses the CSS).
COPY --from=builder /app/src/lib/invoice-styles.css ./src/lib/invoice-styles.css

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p data data/downloads public/downloads public/uploads/cms \
    public/uploads/client-avatars public/uploads/review-media \
    public/sarjan-assets/client-avatars

EXPOSE 3000
CMD ["node", "server.js"]
