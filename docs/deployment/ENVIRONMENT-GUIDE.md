# Environment Guide

## Variable templates

Copy the correct file into Coolify per application:

| File                       | Environment |
| -------------------------- | ----------- |
| `.env.development.example` | dev         |
| `.env.staging.example`     | staging     |
| `.env.production.example`  | production  |

## Core variables

| Variable              | Development    | Staging      | Production         |
| --------------------- | -------------- | ------------ | ------------------ |
| `APP_ENV`             | `development`  | `staging`    | `production`       |
| `NODE_ENV`            | `production`\* | `production` | `production`       |
| `NEXT_PUBLIC_APP_URL` | dev URL        | staging URL  | sarjantextiles.com |

\* Next.js runs `NODE_ENV=production` in Docker even for dev/staging hosts.

## Database isolation

| DB name (suggested) | Container                 |
| ------------------- | ------------------------- |
| `sarjan_dev`        | `sarjan-dev-postgres`     |
| `sarjan_staging`    | `sarjan-staging-postgres` |
| `sarjan_textiles`   | `sarjan-postgres`         |

Code: `src/lib/app-env.ts` warns if dev/staging URLs look like production DB.

## Uploads

Set `UPLOADS_ENV_PREFIX` → files under `public/uploads/{dev|staging|production}/`.

Production CMS paths (`/uploads/cms/`) remain unchanged until you enable env-prefixed paths in a follow-up PR.

## AI / memory

Use separate:

- OpenAI keys per env (optional)
- `AI_MEMORY_NAMESPACE=dev|staging|production` (when enabled)
- Isolated Postgres → isolated chat sessions, recommendations, leads

## Analytics

| Env         | GA4 / Meta               |
| ----------- | ------------------------ |
| Development | `ENABLE_ANALYTICS=false` |
| Staging     | Test property IDs only   |
| Production  | Live IDs                 |

## Logging

Resolved by `logLevel()` in `app-env.ts`: debug → info → warn.

## Runtime detection

Server code: `import { resolveAppEnv, appPublicUrl } from "@/lib/app-env"`.

Health: `GET /api/health` returns `{ env, status, checks }`.
