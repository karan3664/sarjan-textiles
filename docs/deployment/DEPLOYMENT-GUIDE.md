# Deployment Guide

## Architecture

```
                    Cloudflare DNS
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   dev.sarjan...    staging.sarjan...   sarjantextiles.com
        │                 │                 │
        ▼                 ▼                 ▼
   Coolify Dev      Coolify Staging    Coolify Production
        │                 │                 │
        ▼                 ▼                 ▼
  sarjan-dev-db    sarjan-staging-db   sarjan-postgres
```

## First-time Coolify setup (dev + staging)

1. In Coolify, create **two new applications** (do not modify production app settings without review).
2. Connect repo `karan3664/sarjan-textiles`.
3. Set branch: `development` (dev app), `staging` (staging app).
4. Use same Dockerfile as production.
5. Set build args per env:
   - Dev: `APP_ENV=development`, `NEXT_PUBLIC_APP_URL=https://dev.sarjantextiles.com`
   - Staging: `APP_ENV=staging`, `NEXT_PUBLIC_APP_URL=https://staging.sarjantextiles.com`
6. Paste env vars from `.env.development.example` / `.env.staging.example`.
7. Create Postgres services: `sarjan-dev-postgres`, `sarjan-staging-postgres`.
8. Copy deploy webhook URL → GitHub secret `COOLIFY_DEPLOY_WEBHOOK_DEV` / `_STAGING`.
9. Point Cloudflare DNS A records to VPS (already done per your setup).

## Deploy development

```bash
git push origin development
```

GitHub Actions: `deploy-development.yml` runs automatically.

## Deploy staging

```bash
git push origin staging
```

## Deploy production

```bash
git push origin prod
```

Uses existing `deploy-coolify.yml` — **no changes** in this implementation.

## Verify

```bash
BASE_URL=https://dev.sarjantextiles.com bash scripts/vps/health-check.sh
```

## Mobile

After web deploy, build mobile against correct API:

| Build      | Command                     | API                        |
| ---------- | --------------------------- | -------------------------- |
| Dev        | `npm run build:apk:dev`     | dev.sarjantextiles.com     |
| Staging    | `npm run build:apk:staging` | staging.sarjantextiles.com |
| Production | `npm run build:apk`         | sarjantextiles.com         |

## Troubleshooting

| Issue                               | Fix                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Deploy webhook 401                  | Rotate `COOLIFY_API_TOKEN`                                                |
| Health check 503                    | Check `DATABASE_URL` on Coolify env                                       |
| Wrong env in `/api/health`          | Set `APP_ENV` explicitly                                                  |
| Mobile hits prod from staging build | Re-run `APP_ENV=staging node scripts/write-build-config.js` before Gradle |

See also: [../VPS-COOLIFY.md](../VPS-COOLIFY.md)
