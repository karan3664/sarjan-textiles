# Coolify Setup Checklist

Per-environment Coolify application configuration. **Do not edit the live production app** until staging/dev are verified.

## Per application

| Setting    | Dev                    | Staging                    | Production         |
| ---------- | ---------------------- | -------------------------- | ------------------ |
| Branch     | `development`          | `staging`                  | `prod`             |
| Domain     | dev.sarjantextiles.com | staging.sarjantextiles.com | sarjantextiles.com |
| Dockerfile | repo root              | repo root                  | repo root          |
| Port       | 3000                   | 3000                       | 3000               |

## Build arguments (Coolify)

**Development**

```
APP_ENV=development
NEXT_PUBLIC_APP_URL=https://dev.sarjantextiles.com
NEXT_PUBLIC_SITE_URL=https://dev.sarjantextiles.com
```

**Staging**

```
APP_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.sarjantextiles.com
NEXT_PUBLIC_SITE_URL=https://staging.sarjantextiles.com
```

**Production** (existing — do not change without release window)

```
APP_ENV=production
NEXT_PUBLIC_SITE_URL=https://sarjantextiles.com
```

## Postgres services

Create separate Coolify Postgres resources:

1. `sarjan-dev-postgres` → database `sarjan_dev`
2. `sarjan-staging-postgres` → database `sarjan_staging`
3. `sarjan-postgres` (existing production)

## Webhooks → GitHub secrets

| Coolify app | GitHub secret                       |
| ----------- | ----------------------------------- |
| Dev         | `COOLIFY_DEPLOY_WEBHOOK_DEV`        |
| Staging     | `COOLIFY_DEPLOY_WEBHOOK_STAGING`    |
| Production  | `COOLIFY_DEPLOY_WEBHOOK` (existing) |

## Volumes

Mount persistent volumes for each app:

- `public/uploads` (isolated per app instance)
- `public/downloads` (production APK — dev may omit)

## Cloudflare

DNS A records → VPS IP (already configured):

- `dev.sarjantextiles.com`
- `staging.sarjantextiles.com`
- `sarjantextiles.com`

SSL: Full (strict) recommended.

See also: [../VPS-COOLIFY.md](../VPS-COOLIFY.md)
