# Deploy Sarjan Textiles (Supabase + Vercel / Railway)

This app is **one Next.js 15 project**. Use **Supabase** for Postgres + Storage. Use **either Vercel or Railway** to host the web app (deploying the same app to both is usually unnecessary cost unless you have a specific split).

---

## 1. Supabase (database + storage)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL → New query** and run migrations **in this order** (copy/paste each file from `supabase/migrations/`):

   | Order | File                                               |
   | ----- | -------------------------------------------------- |
   | 1     | `20260509203000_schema.sql`                        |
   | 2     | `20260509203100_seed_core.sql`                     |
   | 3     | `20260510143000_pricing_tables.sql`                |
   | 4     | `20260510171000_app_backups.sql`                   |
   | 5     | `20260510183000_analytics_events.sql`              |
   | 6     | `20260514170000_multilevel_pricing_categories.sql` |
   | 7     | `20260519180000_client_avatar_url.sql`             |
   | 8     | `20260519220000_blog_comments.sql`                 |
   | 9     | `20260519233000_blog_comments_admin_replies.sql`   |
   | 10    | `20260521143000_client_carts_password_resets.sql`  |
   | 11    | `20260521150000_admin_notification_state.sql`      |

3. **Project Settings → API**: copy `Project URL`, `anon public` key, and `service_role` key (server-only; never expose to the browser).

4. **Storage**: the app expects bucket **`cms-media`** (public). The upload route tries to create it; you can also create it manually in **Storage** with public read if you prefer.

5. Optional: install [Supabase CLI](https://supabase.com/docs/guides/cli), run `supabase link`, then `supabase db push` if you add a `config.toml` later—until then, SQL Editor is enough.

---

## 2. Production environment variables

Set these on **Vercel** and/or **Railway** (same values if you use one host).

### Required for real DB (not JSON file mode)

| Variable                        | Example / notes                |
| ------------------------------- | ------------------------------ |
| `SUPABASE_ENABLED`              | `true`                         |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://xxxx.supabase.co`     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | service role key (server only) |

### Site + admin auth

| Variable                         | Notes                                                          |
| -------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`           | Production URL, e.g. `https://sarjantextiles.com`              |
| `ADMIN_SESSION_SECRET`           | Long random string                                             |
| `CLIENT_JWT_SECRET`              | Long random string                                             |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Or `ADMIN_USERS_JSON` for multiple admins (see `.env.example`) |

**Storefront URLs (CMS-driven):**

- **`/categories`** — master list of category hubs. **`/categories/[slug]`** — hub with subcategory cards (edit in **Admin → Category pages**).
- **`/site/[slug]`** — multi-purpose pages from custom sections (edit in **Admin → Custom site pages**).

### Email (orders, OTP, etc.)

| Variable                                                        | Notes                |
| --------------------------------------------------------------- | -------------------- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | As in `.env.example` |

### AI Product Studio (optional)

| Variable               | Notes                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `AI_IMAGE_PROVIDER`    | `local` (no cloud), `vertex`, or `openai`                                                         |
| Vertex / OpenAI vars   | See `.env.example`                                                                                |
| `AI_STUDIO_DATA_DIR`   | Optional absolute path for studio files (defaults to `/tmp/...` on Vercel, `./products` locally). |
| `AI_STUDIO_PUBLIC_DIR` | Optional absolute path for approved “public” JPEGs (defaults next to tmp on Vercel).              |

On **Vercel**, the app cannot write under `process.cwd()` at runtime. Studio state and uploads go to **`/tmp/sarjan-ai-studio/...`** automatically when `VERCEL` is set. Set **`NEXT_PUBLIC_SITE_URL`** to your canonical domain (e.g. `https://sarjantextiles.com`) so approved image URLs use that host for **`/api/public/ai-products/...`** (storefront-visible CMS links). Without it, URLs fall back to `VERCEL_URL` for the deployment.

### Vercel Cron (daily backup)

`vercel.json` schedules `GET /api/cron/daily-backup` daily.

| Variable      | Notes                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `CRON_SECRET` | Random string; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when configured in the dashboard to match this route. |

If `CRON_SECRET` is unset, the cron route does not require auth (not recommended in production).

---

## 3. Vercel (recommended for Next.js)

1. [vercel.com](https://vercel.com) → **Add New → Project** → import `karan3664/sarjan-textiles`.
2. **Production branch**: set to `main` or `development` depending on what you use for production.
3. **Framework preset**: Next.js (auto).
4. **Environment variables**: add all variables from section 2 (Production + Preview as needed).
5. **Deploy**. After first deploy, confirm **Cron Jobs** show the job from `vercel.json`.
6. **Domains**: add `sarjantextiles.com` (and www) and point DNS as Vercel instructs; align `NEXT_PUBLIC_SITE_URL`.

**Note:** `data/local-db.json` is gitignored. With `SUPABASE_ENABLED=true`, the app should use Supabase paths; do not rely on the JSON file in production (`assertProductionDatabase` guards this).

---

## 4. Railway (alternative host)

Use Railway if you prefer it over Vercel for this app (same repo, same env vars).

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub** → select `karan3664/sarjan-textiles`.
2. **Settings → Build**: Nixpacks will detect Node; root directory repo root.
3. **Variables**: paste the same set as in section 2.
4. **Deploy**: default start is `npm run start` (see `railway.toml`). Railway sets `PORT`; Next.js respects it.

**Cron on Railway:** either use Railway Cron plugin, an external cron hitting your backup URL with `Authorization: Bearer <CRON_SECRET>`, or keep Vercel only for cron + use Railway for web (advanced split).

---

## 5. Go-live checklist

- [ ] All migrations applied on Supabase; smoke test login + one admin page.
- [ ] `SUPABASE_ENABLED=true` and service role only on server env.
- [ ] Strong `ADMIN_SESSION_SECRET`, `CLIENT_JWT_SECRET`, `CRON_SECRET`.
- [ ] `NEXT_PUBLIC_SITE_URL` matches the live domain (OAuth/callbacks if you add later).
- [ ] SMTP tested from **Admin → system test email** (if exposed).
- [ ] Production deploy: `npm run build` passes (run locally before tagging release).
- [ ] **Mobile visual search:** `POST /api/search/visual` is live (included in this repo). Set `OPENAI_API_KEY` on the server for best results (GPT-4o-mini vision). Without it, the API falls back to basic color matching. Redeploy after pulling the latest backend.

---

## 6. Mobile visual search API

The Sarjan Textiles app calls **`POST /api/search/visual`** with multipart form data:

| Field  | Required | Notes                                   |
| ------ | -------- | --------------------------------------- |
| `file` | Yes      | Product photo (JPEG/PNG/WEBP, max 6 MB) |
| `q`    | No       | Optional text to refine image results   |

**Response:** `{ items, total, keywords, colors, terms, source }` — product rows from the CMS catalogue, ranked by visual/text match.

**Env (optional but recommended):**

| Variable              | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `OPENAI_API_KEY`      | Vision analysis via `gpt-4o-mini` (same key as order bot) |
| `VISUAL_SEARCH_MODEL` | Override model (default `gpt-4o-mini`)                    |

After deploy, smoke test:

```bash
curl -s -X POST "https://YOUR_DOMAIN/api/search/visual" \
  -F "file=@/path/to/fabric-sample.jpg" | head -c 400
```

---

## 7. Git push

Push your branch (e.g. `development` or `main`) to GitHub; Vercel/Railway then redeploy from the connected branch.

```bash
git add -A && git status
git commit -m "docs: add production deploy guide and Railway config"
git push origin development
```

For production, merge to `main` when ready and point Vercel production branch to `main`.
