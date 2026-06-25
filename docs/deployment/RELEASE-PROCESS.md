# Release Process

## Standard release

1. **Develop** — merge feature PRs into `development`.
2. **Dev deploy** — automatic; smoke test on https://dev.sarjantextiles.com
3. **Staging** — merge `development` → `staging`.
4. **QA** — full regression on staging (orders, auth, admin, AI, search, payments).
5. **Production** — merge `staging` → `prod`; automatic deploy via existing workflow.
6. **Post-deploy** — run health check; monitor logs 15 minutes.

## Versioning

| Component    | Version location                                      |
| ------------ | ----------------------------------------------------- |
| Web          | `package.json`                                        |
| Consumer app | `android/app/build.gradle`, `src/constants/config.ts` |
| Admin app    | `android/app/build.gradle`, `src/constants/config.ts` |

## Hotfix

```bash
git checkout prod && git pull
git checkout -b hotfix/critical-fix
# fix, PR to prod
# after deploy, back-merge to staging and development
```

## Checklist before production

- [ ] Staging QA signed off
- [ ] DB migration tested on staging
- [ ] No dev/staging secrets in prod env
- [ ] `ci-production-gate` green on PR to `prod`
- [ ] APK builds tested if mobile release included
- [ ] Rollback plan confirmed (previous Coolify deployment ID)

## Mobile release with web

1. Web deploy to prod (existing flow).
2. `npm run release:apk:deploy` in consumer app (pushes APK metadata to `prod` branch).
3. `deploy-coolify.yml` syncs APK to VPS volume.

Admin APK: `npm run release:apk` in admin-app → copy to `public/downloads/sarjan-admin.apk`.
