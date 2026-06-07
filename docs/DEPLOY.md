# Deploy Sarjan Textiles (Hostinger VPS + Coolify)

Production runs on **Hostinger VPS** with **Coolify**, **PostgreSQL** on the same VPS, and **disk uploads** under `public/uploads/`.

**Primary guide:** [docs/VPS-COOLIFY.md](./VPS-COOLIFY.md)

---

## Quick summary

1. Bootstrap Postgres on the VPS (`scripts/vps/bootstrap-postgres.sh` + SQL in `supabase/migrations/`).
2. Deploy the Next.js app in Coolify using the repo **Dockerfile**.
3. Set **`DATABASE_URL`** and mount persistent volumes:
   - `/app/public/uploads` — CMS media
   - `/app/data` — local backups / JSON fallbacks
4. Set admin secrets, SMTP, Firebase (push), and `CRON_SECRET` for cron jobs.

---

## Required production env

| Variable                         | Notes                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | VPS Postgres, e.g. `postgresql://sarjan:...@sarjan-postgres:5432/sarjan_textiles` |
| `NEXT_PUBLIC_SITE_URL`           | `https://sarjantextiles.com`                                                      |
| `ADMIN_SESSION_SECRET`           | Long random string                                                                |
| `CLIENT_JWT_SECRET`              | Long random string                                                                |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Or `ADMIN_USERS_JSON`                                                             |
| `SMTP_*`                         | Transactional email                                                               |
| `CRON_SECRET`                    | Protects `/api/cron/*`                                                            |
| `FIREBASE_SERVICE_ACCOUNT`       | Optional mobile push                                                              |

Without `DATABASE_URL` in production, the app throws (`assertProductionDatabase`).

---

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3001`. Without `DATABASE_URL`, data uses JSON files under `data/` (gitignored).

---

## Go-live checklist

- [ ] All SQL migrations applied on VPS Postgres
- [ ] `DATABASE_URL` set in Coolify
- [ ] Persistent volumes mounted (`/app/public/uploads`, `/app/data`)
- [ ] Strong secrets for admin, client JWT, cron
- [ ] SMTP tested
- [ ] `npm run build` passes locally
- [ ] Re-upload CMS banner images after first VPS deploy if needed

---

## Legacy note

Older docs referenced Supabase cloud + Vercel. That stack is **removed** — use VPS Postgres + Coolify only.
