# Developer Guide

## Daily workflow

```bash
git checkout development
git pull
git checkout -b feature/orders-export

# Local web (port 3001)
cd sarjan-textiles
cp .env.development.example .env.local   # first time only
npm run dev

# Mobile → local API
cd sarjan-textiles-app
npm start
npm run android

# Admin → dev API or iOS proxy
cd sarjan-textiles-admin-app
npm run dev:proxy   # optional iOS sim
npm start
```

## PR flow

1. Push `feature/*` → open PR to `development`
2. Wait for `ci.yml` (lint, typecheck, build)
3. Merge → auto deploy to dev
4. Test on https://dev.sarjantextiles.com

## Environment-aware code

```typescript
import { resolveAppEnv, isProductionEnv } from "@/lib/app-env";

if (!isProductionEnv()) {
  console.debug("verbose diagnostics");
}
```

## Mobile API per build

```bash
APP_ENV=staging npm run build:apk:staging
```

Install APK: `com.sarjantextiles.staging` (side-by-side with production).

## Do not

- Commit `.env.local` or production secrets
- Point local `DATABASE_URL` at production
- Push directly to `prod` without staging QA

## Useful commands

```bash
curl https://dev.sarjantextiles.com/api/health | jq
npm run lint && npx tsc --noEmit
```
