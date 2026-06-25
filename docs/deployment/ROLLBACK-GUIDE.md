# Rollback Guide

## When to rollback

- Health check fails after deploy
- Error rate spike on orders/auth/payments
- Database migration caused data issue

## Coolify UI (fastest)

1. Open Coolify → Production application → **Deployments**
2. Select last **successful** deployment
3. Click **Redeploy** / **Rollback**

## Script

```bash
COOLIFY_APP_UUID=<production-app-uuid> \
COOLIFY_API_TOKEN=<token> \
bash scripts/vps/rollback-coolify.sh
```

## Git revert

If bad code is on `prod`:

```bash
git checkout prod
git revert <bad-commit-sha>
git push origin prod
```

Triggers automatic redeploy of previous good state + revert commit.

## Database rollback

SQL migrations are **forward-only**. Restore from backup:

```bash
docker exec -i sarjan-postgres psql -U sarjan sarjan_textiles < /root/backups/pre-migrate-YYYY-MM-DD.sql
```

## Mobile

Users keep installed APK — rollback web API first; release previous APK if needed.

## Auto-rollback (future)

Wire `deploy-coolify.yml` post-step:

```yaml
- run: BASE_URL=https://sarjantextiles.com bash scripts/vps/health-check.sh
- if: failure()
  run: # trigger rollback webhook
```

Not enabled on production yet — requires your approval to modify `deploy-coolify.yml`.
