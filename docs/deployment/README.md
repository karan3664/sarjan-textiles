# Multi-Environment Deployment — Index

Sarjan Textiles uses **three isolated environments** on Coolify + Cloudflare:

| Environment | URL                                | Git branch    | Coolify app |
| ----------- | ---------------------------------- | ------------- | ----------- |
| Development | https://dev.sarjantextiles.com     | `development` | dev         |
| Staging     | https://staging.sarjantextiles.com | `staging`     | staging     |
| Production  | https://sarjantextiles.com         | **`prod`**    | production  |

> **Important:** Production currently deploys from branch **`prod`**, not `main`.  
> `deploy-coolify.yml` is **unchanged** so live traffic is unaffected.  
> See [BRANCH-STRATEGY.md](./BRANCH-STRATEGY.md) before renaming `prod` → `main`.

## Guides

| Document                                               | Purpose                             |
| ------------------------------------------------------ | ----------------------------------- |
| [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)           | End-to-end deploy flow              |
| [BRANCH-STRATEGY.md](./BRANCH-STRATEGY.md)             | Git branches & PR rules             |
| [ENVIRONMENT-GUIDE.md](./ENVIRONMENT-GUIDE.md)         | Env vars, DB, uploads, AI isolation |
| [DATABASE-GUIDE.md](./DATABASE-GUIDE.md)               | Migrations per environment          |
| [CICD-GUIDE.md](./CICD-GUIDE.md)                       | GitHub Actions pipelines            |
| [RELEASE-PROCESS.md](./RELEASE-PROCESS.md)             | develop → staging → production      |
| [ROLLBACK-GUIDE.md](./ROLLBACK-GUIDE.md)               | One-click rollback                  |
| [DEVELOPER-GUIDE.md](./DEVELOPER-GUIDE.md)             | Daily dev workflow                  |
| [COOLIFY-SETUP.md](./COOLIFY-SETUP.md)                 | Coolify + secrets checklist         |
| [IMPLEMENTATION-REPORT.md](./IMPLEMENTATION-REPORT.md) | What was built & validation         |

## Quick start (developer)

```bash
# 1. Feature branch from development
git checkout development && git pull
git checkout -b feature/my-feature

# 2. PR → development → auto deploy dev

# 3. After QA on dev, merge development → staging

# 4. After staging QA, merge staging → prod (production)
```

## Health check

```bash
curl -s https://dev.sarjantextiles.com/api/health | jq
curl -s https://staging.sarjantextiles.com/api/health | jq
curl -s https://sarjantextiles.com/api/health | jq
```
