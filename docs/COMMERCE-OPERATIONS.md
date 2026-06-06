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

## GST display (checkout / cart)

- `NEXT_PUBLIC_GST_RATE_ON_SALE` — decimal rate (default `0.05` = 5%) on the cart subtotal.
- The **GST line appears only** when the logged-in client account has a **GST number** saved (registration or account profile). No TDS/TCS lines on checkout.

## GSTIN lookup (registration)

The storefront **Verify GST** button calls `POST /api/gst/verify`. The official [GST taxpayer search](https://services.gst.gov.in/services/searchtp) uses a **6-digit numeric captcha** tied to a short-lived `CaptchaCookie`.

- **Built-in flow**: `GET /api/gst/captcha` loads the portal image server-side and stores the cookie in memory; the client sends the digits plus `captchaSessionId` with `POST /api/gst/verify`. This mirrors the public portal behaviour without calling `gst.gov.in` from the browser (avoids CORS and keeps cookies on your server).
- **Serverless**: captcha sessions are **signed tokens** (cookie header embedded in `sessionId`), so GET captcha and POST verify work across Vercel instances without Redis.
- **Fallback**: users can still enter the **legal name manually** when the portal is down or sessions fail; admins reconcile during approval.
- **Alternative**: set `SARJAN_GST_LOOKUP_URL` (and optionally `SARJAN_GST_LOOKUP_SECRET`) to your own HTTPS service or a **GSP / aggregator** that returns taxpayer JSON or `{ legalName, tradeName? }` for `POST { gstin }`. See `.env.example`.

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
