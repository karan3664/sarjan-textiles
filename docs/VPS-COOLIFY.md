# Sarjan Textiles on Hostinger VPS + Coolify

One **Next.js** app (website + `/api/*` + `/admin`). No separate Node API service.

Server: `69.62.77.149` · Coolify dashboard: `http://127.0.0.1:8000` (use SSH tunnel from Mac if port 8000 is slow externally).

---

## A. Coolify login (if browser blank on `:8000`)

On your **Mac**:

```bash
ssh -N -L 8000:127.0.0.1:8000 root@69.62.77.149
```

Browser: **http://localhost:8000/login**

Hostinger firewall must allow: 22, 80, 443, 8000, 8443.

---

## B. PostgreSQL (one paste on VPS Web Terminal)

### 1. Copy migrations from Mac (once)

```bash
scp -r /Users/kbrahmaxatr/Desktop/Karan/sarjan-textiles/supabase/migrations root@69.62.77.149:/root/migrations/
scp /Users/kbrahmaxatr/Desktop/Karan/sarjan-textiles/scripts/vps/bootstrap-postgres.sh root@69.62.77.149:/root/
```

### 2. On VPS (Hostinger Web Terminal)

```bash
bash /root/bootstrap-postgres.sh
```

Or clone from GitHub (public repo):

```bash
REPO_URL=https://github.com/YOUR_USER/sarjan-textiles.git REPO_BRANCH=development bash /root/bootstrap-postgres.sh
```

Output includes `DATABASE_URL` and saves `/root/sarjan-db-credentials.env`.

**Do not use** the internal `coolify-db` container for Sarjan data — that is only for Coolify itself.

---

## C. Deploy app in Coolify

1. **+ New Project** → `Sarjan Textiles`
2. **+ New Resource → Application → GitHub** → `sarjan-textiles`
3. Branch: `development` or `main`
4. **Build pack**: Dockerfile (repo root `Dockerfile`)
5. **Port**: `3000`
6. **Domains**: `sarjantextiles.com` → enable Let's Encrypt

### Persistent storage (required)

| Container path        | Purpose              |
| --------------------- | -------------------- |
| `/app/public/uploads` | CMS images/videos    |
| `/app/data`           | backups, local files |

### Environment variables

Copy from `.env.example`. Minimum production set:

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://sarjantextiles.com

# From /root/sarjan-db-credentials.env after bootstrap
DATABASE_URL=postgresql://sarjan:PASSWORD@sarjan-postgres:5432/sarjan_textiles

# Until postgres code migration ships, production still needs Supabase OR json mode fails.
# Target state (VPS-only):
SUPABASE_ENABLED=false

ADMIN_SESSION_SECRET=<64+ random chars>
CLIENT_JWT_SECRET=<64+ random chars>
ADMIN_EMAIL=admin@sarjantextiles.com
ADMIN_PASSWORD=<strong>
CRON_SECRET=<random>

SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="Sarjan Textiles <info@sarjantextiles.com>"

FIREBASE_SERVICE_ACCOUNT=<one-line JSON>

# Optional — version is read from public/downloads/mobile-release.json (updated by npm run release:apk).
# Only set these if you need to override without a git push:
# MOBILE_APP_LATEST_VERSION=1.0.27
# MOBILE_APP_VERSION_CODE=28
```

### Auto deploy on git push (no manual Redeploy)

**Advanced → Auto Deploy** should stay **ON**.

Port **8000** (Coolify UI) is **not open** on the public internet — `http://69.62.77.149:8000/...` times out from Mac/GitHub. Use SSH tunnel only for the dashboard UI; webhooks from GitHub will not work until you expose Coolify on HTTPS (e.g. `coolify.sarjantextiles.com`).

**Recommended: GitHub Actions** (repo includes `.github/workflows/deploy-coolify.yml`):

1. Coolify → **Keys & Tokens** (sidebar) → **+ New** → name `github-deploy` → enable **deploy** → copy token (shown once).
2. On VPS, test deploy (`401` without token is expected):
   ```bash
   curl -fsS -H "Authorization: Bearer YOUR_COOLIFY_TOKEN" \
     "http://127.0.0.1:8000/api/v1/deploy?uuid=YOUR_APP_UUID&force=false"
   ```
3. GitHub repo → **Settings → Secrets and variables → Actions** → add:

   | Secret                   | Value                                                                |
   | ------------------------ | -------------------------------------------------------------------- |
   | `VPS_HOST`               | `69.62.77.149`                                                       |
   | `VPS_USER`               | `root`                                                               |
   | `VPS_SSH_PRIVATE_KEY`    | private key that can SSH to VPS                                      |
   | `COOLIFY_DEPLOY_WEBHOOK` | `http://127.0.0.1:8000/api/v1/deploy?uuid=YOUR_APP_UUID&force=false` |
   | `COOLIFY_API_TOKEN`      | token from step 1 (**required**)                                     |

4. Push to `main` → **Actions** tab shows deploy → Coolify **Deployments** starts automatically.

Manual **Redeploy** in Coolify UI only when debugging or retrying a failed build.

**GitHub Actions fails in ~8s (SSH):**

1. Open the failed run log — look for `ssh: handshake failed`, `permission denied`, or `connection timed out`.
2. `VPS_SSH_PRIVATE_KEY` must be the **private** key (`-----BEGIN OPENSSH PRIVATE KEY-----`), not `.pub`.
3. On Mac, test the same key GitHub uses:
   ```bash
   ssh -i ~/.ssh/id_ed25519 root@69.62.77.149 "echo ok"
   ```
   If this fails locally, fix VPS `authorized_keys` first (`ssh-copy-id`).
4. Hostinger firewall: allow **TCP 22** from anywhere (GitHub Actions uses dynamic IPs).
5. After fixing, **Actions → Re-run all jobs**.

### Mobile APK release (no Coolify env edits)

Version comes from `public/downloads/mobile-release.json` (written automatically):

```bash
# In sarjan-textiles-app — bump build.gradle + config.ts first
npm run release:apk

# In sarjan-textiles — commit APK + manifest + push
git add public/downloads/
git commit -m "release: mobile APK 1.0.28"
git push origin main
```

Coolify auto-deploy picks up the new APK and version. You do **not** need to change `MOBILE_APP_*` in Coolify each release.

### Cron (replaces Vercel)

On VPS `/etc/cron.d/sarjan`:

```cron
0 2 * * * root curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://sarjantextiles.com/api/cron/daily-backup
0 * * * * root curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://sarjantextiles.com/api/cron/abandoned-cart-reminders
```

### DB backup

```cron
0 3 * * * root docker exec sarjan-postgres pg_dump -U sarjan sarjan_textiles | gzip > /var/backups/sarjan-$(date +\%F).sql.gz
```

---

## D. DNS

| Type | Name  | Value          |
| ---- | ----- | -------------- |
| A    | `@`   | `69.62.77.149` |
| A    | `www` | `69.62.77.149` |

---

## E. Code blocker (important)

The app still reads/writes via **Supabase JS client** in many files. `DATABASE_URL` alone is not enough until the postgres driver layer is wired.

**Order:**

1. Bootstrap Postgres on VPS (this doc) ✅
2. Code: `DATABASE_URL` + `pg` in `local-db.ts` and related stores (in progress)
3. Deploy on Coolify with `SUPABASE_ENABLED=false`
4. Point DNS · cut Vercel/Supabase

Mobile app needs **no change** if domain stays `sarjantextiles.com`.

---

## F. Verify

```bash
curl -sI https://sarjantextiles.com/api/health
docker exec sarjan-postgres psql -U sarjan -d sarjan_textiles -c "SELECT count(*) FROM clients;"
```
