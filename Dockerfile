# Sarjan Textiles — production image for Coolify / Docker.
# Tuned for 2GB VPS: no parallel runner apt during builder npm/next (BuildKit runs
# independent stage RUN steps concurrently unless they COPY --from=builder first).

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
ENV NODE_OPTIONS=--max-old-space-size=1280
RUN npm run build:docker
RUN npm prune --omit=dev

FROM node:22.13-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# COPY first — forces this stage to wait for builder (avoids apt + npm ci in parallel).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p data data/downloads public/downloads public/uploads/cms \
    public/uploads/client-avatars public/sarjan-assets/client-avatars \
    public/sarjan-assets/review-uploads

EXPOSE 3000
CMD ["npm", "start"]
