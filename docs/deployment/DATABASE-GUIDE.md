# Database Guide

## Databases (isolated)

| Environment | Suggested DB      | Branch for migrations |
| ----------- | ----------------- | --------------------- |
| Development | `sarjan_dev`      | `development`         |
| Staging     | `sarjan_staging`  | `staging`             |
| Production  | `sarjan_textiles` | `prod`                |

## Migration files

Location: `db/migrations/*.sql`  
Tracking table: `schema_migrations`

## Apply migrations

### GitHub Actions (recommended)

**Actions → Apply VPS migrations → Run workflow**

- Environment: `development` | `staging` | `production`
- Branch: matching git branch

Production requires explicit environment approval + `ALLOW_PROD_MIGRATE=1` inside script.

### VPS manual

```bash
APP_ENV=development REPO_BRANCH=development bash scripts/vps/apply-migrations-env.sh
APP_ENV=staging REPO_BRANCH=staging bash scripts/vps/apply-migrations-env.sh
ALLOW_PROD_MIGRATE=1 APP_ENV=production REPO_BRANCH=prod bash scripts/vps/apply-migrations-env.sh
```

## Rules

1. **Never** run production migrations from a feature branch.
2. Test migration on **dev** first, then **staging**, then **prod**.
3. Always backup production before migration:

```bash
# On VPS
docker exec sarjan-postgres pg_dump -U sarjan sarjan_textiles > /root/backups/pre-migrate-$(date +%F).sql
```

## Bootstrap new environment DB

```bash
bash scripts/vps/bootstrap-postgres.sh   # see VPS-COOLIFY.md
APP_ENV=development bash scripts/vps/apply-migrations-env.sh
```

## Seed data

Dev/staging may use sanitized copies — **never** copy production PII to dev without masking.
