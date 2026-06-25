# Branch Strategy

## Branches

| Branch        | Purpose                                     | Deploys to                 |
| ------------- | ------------------------------------------- | -------------------------- |
| `prod`        | **Live production** (current)               | sarjantextiles.com         |
| `main`        | Reserved / mirror (not used for deploy yet) | —                          |
| `staging`     | QA & pre-production                         | staging.sarjantextiles.com |
| `development` | Daily integration (`develop` workflow)      | dev.sarjantextiles.com     |
| `feature/*`   | New features                                | — (PR only)                |
| `bugfix/*`    | Bug fixes                                   | — (PR only)                |
| `hotfix/*`    | Urgent production fixes                     | → `prod` after review      |
| `release/*`   | Release candidates                          | → `staging` first          |

## Flow

```
feature/* ──PR──► development ──auto──► Dev
                      │
                      ▼ (merge when dev tested)
                  staging ──auto──► Staging
                      │
                      ▼ (QA sign-off)
                    prod ──auto──► Production
```

## Rules

1. **Never** deploy `feature/*` directly to production.
2. **Never** point dev/staging `DATABASE_URL` at production Postgres.
3. Production migrations run only from `prod` branch (manual gate: `ALLOW_PROD_MIGRATE=1`).
4. Hotfixes: branch from `prod` → fix → PR to `prod` + back-merge to `staging` and `development`.

## `main` vs `prod`

Historically production uses **`prod`**. GitHub `origin/HEAD` points at `main`.

To adopt `main` as production branch (optional, **requires your approval**):

1. Merge `prod` into `main` (fast-forward).
2. Update `deploy-coolify.yml` branch trigger `prod` → `main`.
3. Update Coolify production app to track `main`.
4. Run production health check.

Until then, **all production deploys stay on `prod`**.

## Create `staging` branch (one-time)

```bash
git checkout development
git pull origin development
git checkout -b staging
git push -u origin staging
```

Configure Coolify staging app to watch branch `staging`.
