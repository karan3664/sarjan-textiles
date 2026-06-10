# Sarjan Textiles — production image for Coolify / Docker (preferred over Nixpacks).
FROM node:22.13-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22.13-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22.13-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# 4GB heap on a 2–4GB VPS triggers OOM during `next build` typecheck — keep ≤2048.
ENV NODE_OPTIONS=--max-old-space-size=2048
ARG SITE_LAUNCH_AT
ENV SITE_LAUNCH_AT=${SITE_LAUNCH_AT}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:docker

FROM node:22.13-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p data data/downloads public/downloads public/uploads/cms

EXPOSE 3000
CMD ["npm", "start"]
