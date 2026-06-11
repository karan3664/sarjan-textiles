# Local ↔ Live CMS sync

Local dev (`localhost:3001`) stores CMS in **`data/cms-db.json`**.  
Live site (`sarjantextiles.com`) stores CMS in **PostgreSQL** on the VPS.

They are **not** connected automatically. Use one of the workflows below.

---

## Quick sync (recommended)

From the `sarjan-textiles` folder on your Mac:

```bash
# 1. Local se live — naya page, product, blog sab live par
npm run cms:push

# 2. Live se local — production ka latest copy laptop par
npm run cms:pull

# 3. Images / videos (alag step — DB me sirf URL hota hai)
npm run cms:sync-uploads
```

### Upload sync setup (one-time)

Agar `Could not find remote uploads dir` aaye:

**Option A — VPS par path dhundho (recommended)**

```bash
ssh root@69.62.77.149
# VPS par (Coolify app container ka mount):
docker ps -q | while read c; do
  docker inspect "$c" --format '{{range .Mounts}}{{if eq .Destination "/app/public/uploads"}}{{.Source}}{{end}}{{end}}'
done | grep -m1 .
```

Jo path mile (e.g. `/data/coolify/applications/abc123/public/uploads`), Mac par `.env.local` me add karo:

```env
REMOTE_UPLOADS_DIR=/data/coolify/applications/abc123/public/uploads
```

Phir dubara: `npm run cms:sync-uploads`

**Option B — passwordless SSH (har baar password na daalna pade)**

```bash
ssh-copy-id root@69.62.77.149
```

`.env.local`:

```env
VPS_SSH_PRIVATE_KEY=~/.ssh/id_ed25519
```

### Login

Scripts use `ADMIN_EMAIL` + `ADMIN_PASSWORD` from `.env.local`.

Production par alag password ho to `.env.local` me add karo:

```env
LIVE_ADMIN_EMAIL=admin@sarjantextiles.com
LIVE_ADMIN_PASSWORD=Sarjantex@2024
```

Dry run:

```bash
node scripts/sync-cms.mjs push --dry-run
```

---

## Typical workflow

1. Local par admin me content add/edit karo (`http://localhost:3001/admin`).
2. `npm run cms:push` — text, products, pages live DB me chale jayenge.
3. Agar nayi images upload ki hain → `npm run cms:sync-uploads` (SSH + rsync VPS par).

**Note:** `cms:push` sirf **CMS content** sync karta hai (products, pages, home, blogs, etc.). Live **orders / customers** overwrite nahi hote.

---

## Admin UI (manual)

**Admin → DB Backup / Restore** (`/admin/backups`):

- **Create backup** on local → download JSON → live admin me **Restore upload**.
- Live se backup download → local restore (full snapshot including orders).

Use this for full disaster recovery; day-to-day ke liye `cms:push` / `cms:pull` faster hai.

---

## Always-on sync (advanced)

Agar har local save turant live par chahiye, local dev ko **live Postgres** se connect karo:

1. VPS par Postgres port tunnel (one terminal, chalu rakho):

   ```bash
   ssh -N -L 5433:sarjan-postgres:5432 root@69.62.77.149
   ```

   (Agar ye fail ho, VPS par `docker port sarjan-postgres` check karo — port publish ho to `localhost:5432` use karo.)

2. `.env.local` me `DATABASE_URL` set karo (password `/root/sarjan-db-credentials.env` se VPS par):

   ```env
   DATABASE_URL=postgresql://sarjan:PASSWORD@127.0.0.1:5433/sarjan_textiles
   ```

3. `npm run dev` restart — ab local admin **direct live DB** par likhega.

Images ab bhi alag sync chahiye (`cms:sync-uploads`) ya live admin se upload karo.

---

## What does not sync with `cms:push`

| Item                                         | How to sync                                             |
| -------------------------------------------- | ------------------------------------------------------- |
| CMS text / products / pages                  | `npm run cms:push`                                      |
| Uploaded images (`/uploads/cms/…`)           | `npm run cms:sync-uploads` (needs `REMOTE_UPLOADS_DIR`) |
| AI product images (`/uploads/ai-products/…`) | same rsync script                                       |
| Code changes (React, CSS)                    | `git push` → Coolify deploy                             |
| Mobile APK                                   | `npm run release:apk` flow (see `docs/VPS-COOLIFY.md`)  |
