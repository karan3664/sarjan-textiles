# Commerce operations (India B2B)

This project includes **hooks and UI scaffolding**, not a certified GST portal or payment gateway integration. Treat compliance features as integration points for your CA, ERP, or middleware.

## Guest checkout vs login

- **Cart & catalog** work for guests.
- **Submitting an order** requires an **approved client account** and a valid client JWT (`POST /api/orders` enforces the token).
- When `NEXT_PUBLIC_GUEST_CHECKOUT_MARKETING` is `true` (default), checkout explains the **inquiry / registration** path for visitors who are not logged in (`/inquiry`, `/register`).
- Set `NEXT_PUBLIC_GUEST_CHECKOUT_MARKETING=false` to hide that marketing block.

## Cookie consent & analytics

- `NEXT_PUBLIC_COOKIE_CONSENT=true` shows a consent bar and **defers Google Analytics** plus first-party `/api/analytics/visit` pings until the user accepts.
- Optional GA id override: `NEXT_PUBLIC_GA_MEASUREMENT_ID` (defaults to the existing property id in code if unset).

## TCS / TDS display

- `NEXT_PUBLIC_TCS_RATE_ON_SALE` — decimal rate (e.g. `0.001` for 0.1%) for **display-only** TCS on the taxable subtotal at checkout.
- `NEXT_PUBLIC_TDS_DISPLAY_NOTE` — short disclaimer next to the TCS line.

## E-invoice & e-way **webhooks**

Server env (never expose to the browser):

- `E_INVOICE_WEBHOOK_URL` — `POST` JSON `{ event: "order.created", order }` after client or admin order creation.
- `E_WAY_WEBHOOK_URL` — `POST` JSON `{ event: "order.dispatch_update", order }` when admin moves an order to **Ready for Dispatch** or **Dispatched**.

Your middleware should validate a shared secret header if exposed publicly.

## Admin commerce hub

`/admin/commerce-hub` (super admin & admin) surfaces:

- Duplicate-order style signals (same client, same fingerprint, within 60 minutes).
- High order velocity (4+ orders in 24 hours).
- Credit exposure over `COMMERCE_CREDIT_ALERT_INR` (default ₹250,000) using unpaid / partial pipeline.
- Approved-client counts by **city** as a simple segmentation hint (pair with **Client Pricing**).

## CMS governance

- `CONTENT_PUBLISH_TWO_STEP=true` is a **process flag** documented in the hub; wire reviewer approval in your team SOP or extend CMS APIs as needed.

## Performance (heavy storefront template)

- Keep **Modave template JS** on a budget: prefer `dynamic` pages for stock-sensitive routes, avoid duplicate script loads, and lazy-load non-critical widgets.
- Optional **PWA**: `src/app/manifest.ts` registers a minimal installable shell; add service workers only if you need true offline (not enabled by default).
