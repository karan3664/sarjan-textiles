# Fresh start — clean old demo data (local + live)

Use this when admin will enter **real products and content** from scratch.

## Before anything — backup live

1. Coolify → app → **Terminal** (or SSH VPS):
   ```bash
   docker ps --format '{{.Names}}' | grep -E 'sarjan|postgres'
   ```
2. Postgres dump (replace `CONTAINER` and password from `/root/sarjan-db-credentials.env`):
   ```bash
   source /root/sarjan-db-credentials.env
   docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc \
     > /root/backups/sarjan-before-reset-$(date +%Y%m%d).dump
   ```
3. Copy uploads tarball:
   ```bash
   docker exec YOUR_APP_CONTAINER tar czf - -C /app/public/uploads . \
     > /root/backups/sarjan-uploads-$(date +%Y%m%d).tar.gz
   ```

---

## Local (Mac dev)

From repo root:

```bash
npx tsx scripts/reset-fresh-start.ts --local
npm run dev
```

This clears:

| Path                   | What                                                           |
| ---------------------- | -------------------------------------------------------------- |
| `data/cms-db.json`     | CMS — **0 products**, blank home text, real site settings kept |
| `data/local-db.json`   | No clients, orders, inquiries                                  |
| `public/uploads/cms/*` | Old uploaded banner/product images                             |
| `data/backups/`        | Local backup JSONs                                             |

Open `http://localhost:3001/admin` — catalog should be empty.

**Note:** If `.env.local` has `DATABASE_URL` set, local app reads **Postgres** not JSON — use the live Postgres steps against that DB, or unset `DATABASE_URL` for file mode.

---

## Live (VPS / Coolify + Postgres)

### Step 1 — Generate SQL on Mac

```bash
cd /Users/kbrahmaxatr/Desktop/Karan/sarjan-textiles
npx tsx scripts/reset-fresh-start.ts --sql > /tmp/reset-fresh.sql
scp /tmp/reset-fresh.sql root@69.62.77.149:/root/
```

### Step 2 — Run on VPS

```bash
source /root/sarjan-db-credentials.env
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < /root/reset-fresh.sql
```

If your Postgres container is not `sarjan-postgres`, find it:

```bash
docker ps | grep postgres
```

### Step 3 — Clear uploaded CMS images on live app

```bash
APP=$(docker ps --format '{{.Names}}' | grep -i sarjan | head -1)
docker exec "$APP" sh -c 'rm -rf /app/public/uploads/cms/*'
docker restart "$APP"
```

Persistent volume `/app/public/uploads` in Coolify — files survive redeploy; must delete manually.

### Step 4 — Verify

- `https://sarjantextiles.com/products` — empty or no demo SKUs
- Admin → Products — 0 items
- Admin → Orders / Customers — empty
- Home — blank banners ready for new uploads

---

## What is NOT deleted

- Code, env vars, admin login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- Static assets in `public/sarjan-assets/` (logo, default WebP samples)
- `public/downloads/*.apk` (mobile app files)
- Postgres schema / migrations

---

## Optional: full Postgres wipe + re-migrate

Only if DB is corrupted — **destroys everything**:

```bash
docker rm -f "$CONTAINER_NAME"
docker volume rm sarjan-pg-data
bash /root/bootstrap-postgres.sh
```

Then update Coolify `DATABASE_URL` from new `/root/sarjan-db-credentials.env` and redeploy.
