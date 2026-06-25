# Coolify Setup Checklist

Per-environment Coolify application configuration. **Do not edit the live production app** until staging/dev are verified.

## Per application

| Setting    | Dev                          | Staging                                     | Production               |
| ---------- | ---------------------------- | ------------------------------------------- | ------------------------ |
| Branch     | `development`                | `staging`                                   | `prod`                   |
| Domain     | dev.sarjantextiles.com       | staging.sarjantextiles.com                  | sarjantextiles.com       |
| Admin URL  | admin-dev.sarjantextiles.com | admin-staging.sarjantextiles.com (optional) | admin.sarjantextiles.com |
| Dockerfile | repo root                    | repo root                                   | repo root                |
| Port       | 3000                         | 3000                                        | 3000                     |

## Build arguments (Coolify)

**Development**

```
APP_ENV=development
NEXT_PUBLIC_APP_URL=https://dev.sarjantextiles.com
NEXT_PUBLIC_SITE_URL=https://dev.sarjantextiles.com
ADMIN_HOST=admin-dev.sarjantextiles.com
NEXT_PUBLIC_ADMIN_URL=https://admin-dev.sarjantextiles.com
```

**Staging**

```
APP_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.sarjantextiles.com
NEXT_PUBLIC_SITE_URL=https://staging.sarjantextiles.com
ADMIN_HOST=admin-staging.sarjantextiles.com
NEXT_PUBLIC_ADMIN_URL=https://admin-staging.sarjantextiles.com
```

**Production** (existing — do not change without release window)

```
APP_ENV=production
NEXT_PUBLIC_SITE_URL=https://sarjantextiles.com
ADMIN_HOST=admin.sarjantextiles.com
NEXT_PUBLIC_ADMIN_URL=https://admin.sarjantextiles.com
```

## Admin subdomain (hide `/admin` on public site)

Storefront users should not see `sarjantextiles.com/admin`. Admin panel lives on a separate hostname on the **same Coolify app**.

### 1. DNS (Cloudflare)

Add A records (same VPS IP as main site):

| Name        | Points to |
| ----------- | --------- |
| `admin`     | VPS IP    |
| `admin-dev` | VPS IP    |

Proxy: ON (orange cloud), SSL Full (strict).

### 2. Coolify domains

**Production app** → Domains — add:

```
https://sarjantextiles.com,https://www.sarjantextiles.com,https://admin.sarjantextiles.com
```

**Dev app** → Domains — add:

```
https://dev.sarjantextiles.com,https://www.dev.sarjantextiles.com,https://admin-dev.sarjantextiles.com
```

Save → **Redeploy** each app after env vars below.

### 3. Environment variables

Set `ADMIN_HOST` + `NEXT_PUBLIC_ADMIN_URL` (see build args above). When set:

- `https://admin.sarjantextiles.com/` → admin dashboard
- `https://sarjantextiles.com/admin` → **404** (hidden)
- Obscure login path (`/st-ctl-k8m4x7p2`) only works on **admin** host

`/api/admin/*` stays on the storefront host for the mobile admin app.

### 4. Login URL

After deploy, bookmark:

- Production: `https://admin.sarjantextiles.com/st-ctl-k8m4x7p2`
- Dev: `https://admin-dev.sarjantextiles.com/st-ctl-k8m4x7p2`

(Optional) set `ADMIN_LOGIN_PATH` to a new secret path per environment.

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
- `admin-dev.sarjantextiles.com`
- `staging.sarjantextiles.com`
- `sarjantextiles.com`
- `admin.sarjantextiles.com`

SSL: Full (strict) recommended.

See also: [../VPS-COOLIFY.md](../VPS-COOLIFY.md)
