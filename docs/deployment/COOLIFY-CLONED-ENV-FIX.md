# Coolify — Production clone ke baad fix (Dev & Staging)

Aapne dev/staging **production se clone** kiya — ye sahi shortcut hai, lekin **ye variables zaroor change karo** warna dev/staging production DB aur production secrets use karega.

## Abhi status (check)

```bash
curl -I https://dev.sarjantextiles.com
curl -I https://staging.sarjantextiles.com
```

Agar **503 / no available server** aaye → app deploy nahi hui ya container crash ho raha hai (neeche steps follow karo).

---

## Step 1 — Har app ke liye ye env **change karo**

### Dev app (`dev.sarjantextiles.com`)

| Variable               | Value                                             |
| ---------------------- | ------------------------------------------------- |
| `APP_ENV`              | `development`                                     |
| `NEXT_PUBLIC_APP_URL`  | `https://dev.sarjantextiles.com`                  |
| `NEXT_PUBLIC_SITE_URL` | `https://dev.sarjantextiles.com`                  |
| `DATABASE_URL`         | **Alag dev Postgres** (production wala mat rakho) |
| `ADMIN_SESSION_SECRET` | Naya random string                                |
| `CLIENT_JWT_SECRET`    | Naya random string                                |
| `CRON_SECRET`          | Naya random string                                |
| `UPLOADS_ENV_PREFIX`   | `dev`                                             |
| `ENABLE_ANALYTICS`     | `false`                                           |

### Staging app (`staging.sarjantextiles.com`)

| Variable               | Value                                |
| ---------------------- | ------------------------------------ |
| `APP_ENV`              | `staging`                            |
| `NEXT_PUBLIC_APP_URL`  | `https://staging.sarjantextiles.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://staging.sarjantextiles.com` |
| `DATABASE_URL`         | **Alag staging Postgres**            |
| `ADMIN_SESSION_SECRET` | Naya (dev se bhi alag)               |
| `CLIENT_JWT_SECRET`    | Naya                                 |
| `CRON_SECRET`          | Naya                                 |
| `UPLOADS_ENV_PREFIX`   | `staging`                            |
| `ENABLE_ANALYTICS`     | `true` (test GA ID optional)         |

**Trailing slash mat rakho** URL me — `https://dev.sarjantextiles.com` (end pe `/` nahi).

---

## Step 2 — Alag database (zaroori)

Clone se production `DATABASE_URL` copy hota hai — **ye sabse dangerous hai**.

Coolify me har env ke liye **naya Postgres resource** banao:

| App     | Suggested container name  | Database         |
| ------- | ------------------------- | ---------------- |
| Dev     | `sarjan-dev-postgres`     | `sarjan_dev`     |
| Staging | `sarjan-staging-postgres` | `sarjan_staging` |

Phir dev app ko dev Postgres se link karo, staging ko staging Postgres se.

Production `sarjan-postgres` / `sarjan_textiles` — **sirf production app use kare**.

Deploy ke baad migrations:

```bash
# VPS SSH se
APP_ENV=development REPO_BRANCH=development bash scripts/vps/apply-migrations-env.sh
APP_ENV=staging REPO_BRANCH=staging bash scripts/vps/apply-migrations-env.sh
```

---

## Step 3 — Coolify branch setting

| App        | Git branch                                    |
| ---------- | --------------------------------------------- |
| Dev        | `development`                                 |
| Staging    | `staging` (pehle branch create karo — neeche) |
| Production | `prod` (unchanged)                            |

**Staging branch create (ek baar):**

```bash
cd sarjan-textiles
git checkout development
git checkout -b staging
git push -u origin staging
```

---

## Step 4 — Pehli deploy

Coolify me har app → **Deploy** dabao.

Build fail ho to **Logs** dekho. Common fixes:

- `DATABASE_URL` empty / wrong host → container exit
- Build OOM → same Dockerfile as prod (2GB VPS)
- Wrong branch → purana code

---

## Step 5 — GitHub webhooks (auto deploy)

Har app ka **Deploy Webhook** copy karo → GitHub repo secrets:

| Secret                           | App     |
| -------------------------------- | ------- |
| `COOLIFY_DEPLOY_WEBHOOK_DEV`     | Dev     |
| `COOLIFY_DEPLOY_WEBHOOK_STAGING` | Staging |

Production `COOLIFY_DEPLOY_WEBHOOK` pehle se hai.

---

## Step 6 — Verify

```bash
curl -s https://dev.sarjantextiles.com/api/health | jq
curl -s https://staging.sarjantextiles.com/api/health | jq
```

Healthy response example:

```json
{ "status": "ok", "env": "development", "checks": [...] }
```

---

## Quick checklist

- [ ] Dev `DATABASE_URL` ≠ production
- [ ] Staging `DATABASE_URL` ≠ production
- [ ] `APP_ENV` set on both
- [ ] URLs without trailing slash
- [ ] New secrets (not copied from prod)
- [ ] Branch: dev → `development`, staging → `staging`
- [ ] First deploy green in Coolify
- [ ] `/api/health` returns 200

Production app env **mat chhedo** jab tak dev/staging green na ho.

---

## DATABASE_URL kaise banayein

`DATABASE_URL` ka format:

```
postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
```

Example:

```
postgresql://sarjan_dev:K8m2xP9qR4vN7wL1@sarjan-dev-postgres:5432/sarjan_dev
```

- **USERNAME / PASSWORD** — aap khud choose karte ho (strong password)
- **HOST** — Postgres container ka naam (Coolify internal network pe)
- **DATABASE_NAME** — alag DB har environment ke liye

### Option A — Coolify UI (recommended)

Har environment ke liye **alag Postgres** banao:

1. Coolify → Project → **+ New Resource** → **Database** → **PostgreSQL**
2. Name: `sarjan-dev-postgres` (dev ke liye) ya `sarjan-staging-postgres` (staging ke liye)
3. Database name: `sarjan_dev` / `sarjan_staging`
4. Username + password set karo (ya auto-generate)
5. **Start** karo — green hone do
6. Us Postgres resource ko **dev app se link** karo (Coolify mein "Connect to application" / same network)
7. Coolify often shows **Internal URL** ya `DATABASE_URL` — copy karo

Agar Coolify auto URL na de, manually banao:

```
postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@<container-name>:5432/<POSTGRES_DB>
```

`<container-name>` = Coolify mein Postgres service ka name (e.g. `sarjan-dev-postgres`)

**Dev app** → sirf dev Postgres  
**Staging app** → sirf staging Postgres  
**Production** → existing `sarjan-postgres` (mat badlo)

### Option B — VPS script (SSH / Web Terminal)

Production wala script hi use karo, **alag names** ke saath:

**Dev database:**

```bash
DB_NAME=sarjan_dev \
DB_USER=sarjan_dev \
CONTAINER_NAME=sarjan-dev-postgres \
CREDS_FILE=/root/sarjan-db-credentials.dev.env \
bash /root/bootstrap-postgres.sh
```

**Staging database:**

```bash
DB_NAME=sarjan_staging \
DB_USER=sarjan_staging \
CONTAINER_NAME=sarjan-staging-postgres \
CREDS_FILE=/root/sarjan-db-credentials.staging.env \
bash /root/bootstrap-postgres.sh
```

Script end mein `DATABASE_URL` print karega aur file mein save karega:

```bash
cat /root/sarjan-db-credentials.dev.env
cat /root/sarjan-db-credentials.staging.env
```

Jo `DATABASE_URL=` line aaye, woh Coolify **dev** / **staging** app env mein paste karo.

> Password mein `@`, `#`, `/` ho to URL-encode karna pad sakta hai. Coolify auto-generated password use karo ya simple alphanumeric password rakho.

---

## Secrets kaise banayein (ADMIN_SESSION_SECRET, CLIENT_JWT_SECRET, CRON_SECRET)

Ye **random long strings** hain — passwords jaisa socho, lekin user login ke liye nahi; app internally session/JWT sign karti hai.

**Har environment ke liye alag values** — dev, staging, production teeno different.

### Mac / Terminal pe generate karo

**Teen alag secrets ek saath:**

```bash
echo "ADMIN_SESSION_SECRET=$(openssl rand -hex 32)"
echo "CLIENT_JWT_SECRET=$(openssl rand -hex 32)"
echo "CRON_SECRET=$(openssl rand -hex 24)"
```

Har line ka output copy karke Coolify env mein paste karo.

**Ya Node se:**

```bash
node -e "
const c=require('crypto');
console.log('ADMIN_SESSION_SECRET='+c.randomBytes(32).toString('hex'));
console.log('CLIENT_JWT_SECRET='+c.randomBytes(32).toString('hex'));
console.log('CRON_SECRET='+c.randomBytes(24).toString('hex'));
"
```

### Dev ke liye example (mat copy karo — apna generate karo)

```env
ADMIN_SESSION_SECRET=a1b2c3d4e5f6...64 chars hex...
CLIENT_JWT_SECRET=f6e5d4c3b2a1...64 chars hex...
CRON_SECRET=9k2m8x4p7q1n3r5t6v8w0y
```

### Staging ke liye

Dubara **naya** `openssl rand` chalao — dev wale **reuse mat karo**.

### Kya kaam aata hai

| Secret                 | Kaam                                       |
| ---------------------- | ------------------------------------------ |
| `ADMIN_SESSION_SECRET` | Admin login session token sign/verify      |
| `CLIENT_JWT_SECRET`    | Mobile/web client login JWT                |
| `CRON_SECRET`          | `/api/cron/*` backup/reminder APIs protect |

Production ke secrets **dev/staging mein mat daalo** — clone se aaye ho to **replace** karo.

---

## Coolify mein paste ka order

1. Postgres create + link → `DATABASE_URL` paste
2. Teen secrets generate karke paste
3. `APP_ENV`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` set
4. **Save** → **Redeploy** app
5. `curl https://dev.sarjantextiles.com/api/health` check karo
