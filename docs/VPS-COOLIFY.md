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
scp -r /Users/kbrahmaxatr/Desktop/Karan/sarjan-textiles/db/migrations root@69.62.77.149:/root/migrations/
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
3. Branch: `prod` (production deploys only)
4. **Build pack**: **Dockerfile** (repo root `Dockerfile`) — do **not** use Nixpacks auto-detect (smaller image, fewer export failures).
5. **Port**: `3000`
6. **Domains**: add **both** `sarjantextiles.com` and `www.sarjantextiles.com` → enable Let's Encrypt on each. The app permanently redirects `www` → apex (`next.config.ts` + middleware); without `www` in Coolify, `https://www.sarjantextiles.com` returns 503.

If Coolify shows **Nixpacks** instead of Dockerfile: **Configuration → Build Pack → Dockerfile**.

Remove env var **`NIXPACKS_NODE_VERSION=22`** if set in Coolify — it pins Node 22.11 and is ignored when using Dockerfile. The repo Dockerfile uses **Node 22.13**.

### Persistent storage (required)

| Container path          | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `/app/public/uploads`   | CMS images/videos                              |
| `/app/public/downloads` | Mobile APK files (not baked into Docker image) |
| `/app/data`             | backups, local files                           |

### Environment variables

Copy from `.env.example`. Minimum production set:

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://sarjantextiles.com

# From /root/sarjan-db-credentials.env after bootstrap
DATABASE_URL=postgresql://sarjan:PASSWORD@sarjan-postgres:5432/sarjan_textiles

ADMIN_SESSION_SECRET=<64+ random chars>
CLIENT_JWT_SECRET=<64+ random chars>
ADMIN_EMAIL=admin@sarjantextiles.com
# Coolify expands `$` in env — use base64 (no dollar signs). Remove ADMIN_PASSWORD_HASH if set.
ADMIN_PASSWORD_HASH_B64=<generate-with-node-bcrypt-base64>
CRON_SECRET=<random>
# Runtime env (Configuration → Environment Variables). Redeploy after adding/changing.
SITE_LAUNCH_AT=2026-06-17T12:39:00+05:30

SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="Sarjan Textiles <info@sarjantextiles.com>"

FIREBASE_SERVICE_ACCOUNT=<base64 of full service-account JSON — use scripts/encode-firebase-service-account.mjs>

# Optional — normally leave UNSET. Version is read from public/downloads/mobile-release.json.
# Remove MOBILE_APP_LATEST_VERSION / MOBILE_APP_VERSION_CODE from Coolify if already set (they block new APK releases).
# Only set these for a temporary override without git:
# MOBILE_APP_LATEST_VERSION=1.0.28
# MOBILE_APP_VERSION_CODE=29
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

4. Push to `prod` → **Actions** tab shows deploy → Coolify **Deployments** starts automatically.

Manual **Redeploy** in Coolify UI only when debugging or retrying a failed build.

### Deploy failed during Docker build (exit 255)

Coolify log may stop after `npm ci` or during `next build` — usually **VPS RAM** or **disk full**.

**Repo mitigations:** one sequential `npm ci` in Dockerfile (no parallel prod-deps), `build:docker` skips lint, `NODE_OPTIONS=--max-old-space-size=1280`, `NEXT_PRIVATE_BUILD_WORKER=0`, `experimental.cpus: 1` when `DOCKER_BUILD=1`, `.dockerignore` excludes `public/uploads` and APK binaries.

**Typical log:** build stops right after `Creating an optimized production build ...` with exit **255** and no TypeScript/webpack error — almost always **OOM** (not a code bug). Same commit often builds fine on a Mac.

**On VPS (SSH):**

```bash
free -h
df -h /
docker system prune -af
```

If RAM &lt; 4GB, add swap then redeploy:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

Or upgrade Hostinger VPS to **≥4GB RAM**.

### Deploy failed at “exporting to image” (build OK, exit 255)

The Next.js build finished but Docker could not save the image — usually **VPS disk full** or **build context too large** (APK files in git).

**On VPS (SSH):**

```bash
df -h /
docker system df
docker system prune -af --volumes
df -h /
```

Then **Redeploy** in Coolify. The repo `.dockerignore` excludes versioned APK archives (`sarjan-textiles-1.*.apk`) so only `sarjan-textiles.apk` (~60MB) ships in the image.

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

# In sarjan-textiles — commit manifest only (APK is excluded from Docker image)
git add public/downloads/mobile-release.json
git commit -m "release: mobile APK 1.0.30"
git push origin prod

# Copy APK to VPS persistent volume (once per release; survives redeploys)
scp public/downloads/sarjan-textiles.apk root@69.62.77.149:/data/coolify/applications/<app-id>/public/downloads/
# Or use Coolify → Storage → mount `/app/public/downloads` and upload via SFTP
```

Coolify auto-deploy picks up the new **version** from `mobile-release.json`. The **APK binary** must be on the `/app/public/downloads` volume (not in the Docker image — keeps builds small and avoids export OOM on the VPS).

### Cron (replaces Vercel)

On VPS `/etc/cron.d/sarjan`:

```cron
0 2 * * * root curl -fsS -H "X-Cron-Secret: YOUR_CRON_SECRET" https://sarjantextiles.com/api/cron/daily-backup
0 * * * * root curl -fsS -H "X-Cron-Secret: YOUR_CRON_SECRET" https://sarjantextiles.com/api/cron/abandoned-cart-reminders
0 10 * * * root curl -fsS -H "X-Cron-Secret: YOUR_CRON_SECRET" https://sarjantextiles.com/api/cron/review-reminders
* * * * * root curl -fsS -H "X-Cron-Secret: YOUR_CRON_SECRET" https://sarjantextiles.com/api/cron/launch-newsletter
```

**Review reminders** (`/api/cron/review-reminders`): sends email + push for delivered orders with no review yet — first reminder **3 days** after delivery, second **7 days** after delivery, **max 2** per order.

The launch-newsletter job sends the **Website launch** template once to all active subscribers after `SITE_LAUNCH_AT` (launch page “Notify me”, inquiry, and registration signups). Admin inbox alerts go to **info@sarjantextiles.com** when someone joins the list.

### Local ↔ live CMS sync

Local dev uses `data/cms-db.json`; production uses Postgres. See **`docs/CMS-SYNC.md`**:

```bash
npm run cms:push          # local content → live
npm run cms:pull          # live → local
npm run cms:sync-uploads  # images to VPS volume
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

## E. Verify

```bash
curl -sI https://sarjantextiles.com/api/health
curl -sI https://www.sarjantextiles.com/   # expect 308 → https://sarjantextiles.com/
docker exec sarjan-postgres psql -U sarjan -d sarjan_textiles -c "SELECT count(*) FROM clients;"
```

**CMS banner/images:** uploads save to `/app/public/uploads/cms/` on the persistent volume. The app serves them via `/uploads/cms/*` (runtime route — not bundled in the Docker image). After deploy, re-upload hero slides in **Admin → Home** if old URLs still 404 (files may have been lost before the volume was mounted).

Mobile app needs **no change** if domain stays `sarjantextiles.com`.
