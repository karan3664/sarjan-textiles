# Sarjan Textiles

B2B textile ordering platform built from the provided Modave storefront/admin HTML package and Sarjan brand assets.

## Included

- Next.js App Router source
- Storefront pages: home, product detail, blog, blog detail, about, contact, login, register, wishlist, cart, checkout
- Admin panel: dashboard, products, orders, clients, CMS/settings forms
- Mock API routes under `/api/mock/*`
- Sarjan logo, favicon, banner, and sample product images
- Preserved Modave CSS, SCSS, JavaScript, hover styles, Bootstrap behavior, modal behavior, and supporting assets
- Supabase-ready environment placeholders
- SEO metadata, Open Graph, `robots.txt`, and `sitemap.xml`

## Local Setup

Node.js is required. This machine did not have `node`, `npm`, or `npx` available in PATH when the project was generated.

```bash
cd sarjan-textiles
npm install
npm run dev
```

Production deploy (Supabase, Vercel, Railway): see **[docs/DEPLOY.md](docs/DEPLOY.md)**.

Open:

- Storefront: `http://localhost:3001`
- Admin: `http://localhost:3001/admin`
- Mock products API: `http://localhost:3001/api/mock/products`

## Supabase

Create `.env.local` from `.env.example` and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not commit database passwords or service keys. The current app uses mock data contracts first so the same UI can later switch to Supabase tables, Auth, Storage, and Row Level Security.

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

That component keeps the original Modave HTML structure/classes/scripts, then injects data from the mock API into hero, product, blog, cart, checkout, logo, banner, and image areas. When Supabase is connected, replace the source used by `mockApi`/the data provider with Supabase queries and the same template layer will reflect admin-managed records.

All visible business content should be moved from mock data into admin-managed Supabase records during the database phase.
