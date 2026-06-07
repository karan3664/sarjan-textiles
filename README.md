# Sarjan Textiles

B2B textile ordering platform built from the provided Modave storefront/admin HTML package and Sarjan brand assets.

## Included

- Next.js App Router source
- Storefront pages: home, product detail, blog, blog detail, about, contact, login, register, wishlist, cart, checkout
- Admin panel: dashboard, products, orders, clients, CMS/settings forms
- Mock API routes under `/api/mock/*`
- Sarjan logo, favicon, banner, and sample product images
- Preserved Modave CSS, SCSS, JavaScript, hover styles, Bootstrap behavior, modal behavior, and supporting assets
- PostgreSQL via `DATABASE_URL` (VPS) with JSON fallback for local dev
- SEO metadata, Open Graph, `robots.txt`, and `sitemap.xml`

## Local Setup

Node.js is required. This machine did not have `node`, `npm`, or `npx` available in PATH when the project was generated.

```bash
cd sarjan-textiles
npm install
npm run dev
```

Production deploy (Hostinger VPS + Coolify): see **[docs/VPS-COOLIFY.md](docs/VPS-COOLIFY.md)**.

Open:

- Storefront: `http://localhost:3001`
- Admin: `http://localhost:3001/admin`
- Mock products API: `http://localhost:3001/api/mock/products`

## Database

Create `.env.local` from `.env.example`. For local dev, leave `DATABASE_URL` empty to use JSON files under `data/`. For production on the VPS, set `DATABASE_URL` to your Hostinger Postgres connection string (see `docs/VPS-COOLIFY.md`).

## Data Contract

Current mock data lives in:

```txt
src/data/mock.ts
src/lib/mock-api.ts
```

Template pages are rendered through:

```txt
src/components/shared/ExactTemplatePage.tsx
```

That component keeps the original Modave HTML structure/classes/scripts, then injects data from the CMS/mock API into hero, product, blog, cart, checkout, logo, banner, and image areas. Admin-managed content is stored in Postgres (`cms_snapshots`) or local JSON when developing without `DATABASE_URL`.
