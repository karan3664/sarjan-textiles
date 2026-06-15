# Sarjan Textiles — Complete QA Testing Guide

**Document version:** 1.0  
**Last updated:** May 2026  
**Audience:** External QA / testers (no prior knowledge of the project assumed)

---

## 1. Purpose of this document

This guide explains **what** the Sarjan Textiles website and admin panel are, **how** they work, and **exactly what** you must test. You do not need any briefing from the development team beyond:

- The **test website URL** (provided separately)
- **Login credentials** for admin and B2B client accounts (provided separately)
- This document

Report every issue using the **Bug report template** in Section 4.

---

## 2. What is being tested?

### 2.1 Product summary

**Sarjan Textiles** is a **B2B wholesale textile e-commerce platform** for Ajrakh and related fabrics/apparel. It is **not** a typical retail “buy now with card payment” shop.

| Area                      | URL pattern              | Who uses it                                                 |
| ------------------------- | ------------------------ | ----------------------------------------------------------- |
| **Storefront (frontend)** | `https://[domain]/`      | Public visitors, wholesale buyers (B2B clients)             |
| **Admin panel (backend)** | `https://[domain]/admin` | Internal staff (sales, dispatch, accounts, content, admins) |

### 2.2 Business model (important for testing)

1. **Guests** can browse products, use cart/wishlist locally, but **cannot see prices** or **place orders**.
2. **New businesses register** with company details + **GST number** + email OTP.
3. **Admin approves** the client account.
4. **Approved B2B clients** can log in, see **custom wholesale prices**, add sets to cart, and submit **order requests** (not instant online payment).
5. **Admin** manages orders (approve/reject), dispatch (LR/courier), payments (cheque/credit), inventory, CMS content, blogs, newsletter, etc.

### 2.3 What “success” looks like

- No broken pages, console errors blocking flows, or infinite loading loops
- Correct behavior for **guest vs pending client vs approved client**
- Admin actions save correctly and appear on the live site where applicable
- Emails send when expected (if test SMTP is configured)
- Mobile and desktop layouts usable

---

## 3. Test environment and access

### 3.1 URLs and interactive guide

| Environment    | Storefront URL              | Admin URL                         |
| -------------- | --------------------------- | --------------------------------- |
| **Production** | https://sarjantextiles.com/ | https://sarjantextiles.com/admin/ |

**Colorful HTML guide for testers (open in browser):**  
https://sarjantextiles.com/qa-testing-guide.html

Regenerate after editing this markdown: `node scripts/build-qa-html.mjs`

### 3.2 Browsers and devices (minimum)

Test each **critical path** on:

- **Desktop:** Chrome (latest), Safari (latest)
- **Mobile:** Chrome on Android **or** Safari on iPhone
- **Tablet:** optional but recommended for admin panel

Use both **normal** and **private/incognito** window where noted (especially cart/session tests).

### 3.3 Test accounts (provided separately — do not share publicly)

You should receive a table like this. **Do not commit passwords to bug trackers in plain text** — use “credentials as provided in secure sheet.”

#### B2B client (storefront) accounts

| Account label    | Email                        | Password | Status     | Use for                                     |
| ---------------- | ---------------------------- | -------- | ---------- | ------------------------------------------- |
| Approved client  |                              |          | `approved` | Prices, cart sync, checkout, account pages  |
| Pending client   |                              |          | `pending`  | Login must fail with “under review” message |
| Rejected client  |                              |          | `rejected` | Login must fail with rejection message      |
| New registration | Use a **new** email each run | —        | —          | Full registration flow                      |

#### Admin panel — primary test account

| Role            | Email                      | Password                       | Can access (summary) |
| --------------- | -------------------------- | ------------------------------ | -------------------- |
| **Super Admin** | `admin@sarjantextiles.com` | _(request from project owner)_ | Full admin panel     |

Additional role accounts (sales, dispatch, content, etc.) — provide separately if needed for RBAC testing.

| Role     | Email | Password | Can access (summary)                      |
| -------- | ----- | -------- | ----------------------------------------- |
| Admin    |       |          | Everything except some super-only screens |
| Sales    |       |          | Clients, orders, pricing, reports         |
| Dispatch |       |          | Dispatch, orders, inventory, reports      |
| Accounts |       |          | Payments, reports                         |
| Content  |       |          | CMS, products, blogs, SEO, newsletter     |

### 3.4 Clear cache between tests (when needed)

On mobile or after major fixes, testers should:

1. Clear site data / cache for the domain, **or**
2. Use a fresh incognito session

This avoids old cart/wishlist/login state causing false results.

---

## 4. Bug reporting

### 4.1 Severity

| Level            | Meaning                              | Example                                                     |
| ---------------- | ------------------------------------ | ----------------------------------------------------------- |
| **P1 — Blocker** | Core flow cannot complete            | Cannot login, cannot place order, admin cannot save product |
| **P2 — Major**   | Feature broken but workaround exists | Search wrong results, price wrong for approved client       |
| **P3 — Minor**   | UI/copy/layout issue                 | Spacing, typo, alignment                                    |
| **P4 — Trivial** | Cosmetic                             | Color shade, non-blocking console warning                   |

### 4.2 Bug report template (copy for each issue)

```
Bug ID: (your tracker ID)
Title: Short summary
Severity: P1 / P2 / P3 / P4
Area: Storefront / Admin / Both
Module: e.g. Checkout, Orders, Home CMS
URL: Full URL where issue occurred
Role/User: Guest / Approved client / Admin (sales) / etc.
Browser/Device: Chrome 136 / iPhone Safari 17 / etc.

Steps to reproduce:
1.
2.
3.

Expected result:


Actual result:


Screenshots/screen recording: (attach)
Console errors (F12 → Console): (paste if any)
Network failed requests (F12 → Network, red rows): (optional)
```

---

## 5. Storefront (frontend) — site map and features

### 5.1 Global layout (every page)

The public site uses a common shell:

- **Header:** Logo, navigation menu, search, account icon, wishlist, cart
- **Footer:** Links, newsletter signup, contact/social
- **Side panels (offcanvas):** Mobile menu, mini cart, wishlist, quick view, compare

**Test once on homepage:**

| ID           | Steps                                   | Expected                                                        |
| ------------ | --------------------------------------- | --------------------------------------------------------------- |
| TC-GLOBAL-01 | Open homepage on desktop                | Header/footer load; no horizontal scroll                        |
| TC-GLOBAL-02 | Resize to mobile width                  | Hamburger menu works; cart/wishlist icons visible               |
| TC-GLOBAL-03 | Click each main nav link                | Correct page opens; no 404                                      |
| TC-GLOBAL-04 | Search from header with keyword “shirt” | Lands on product listing with search results                    |
| TC-GLOBAL-05 | Open cart icon without items            | Empty cart message or “no items” state                          |
| TC-GLOBAL-06 | Scroll homepage to Instagram section    | Image carousel shows photos (not broken icons + long text only) |

---

### 5.2 Homepage (`/`)

**Purpose:** Marketing homepage — hero, featured products, categories, brands, Instagram gallery, CMS-driven sections.

| ID         | Priority | Steps                        | Expected                                                 |
| ---------- | -------- | ---------------------------- | -------------------------------------------------------- |
| TC-HOME-01 | P1       | Load `/` as guest            | Page loads under 10s; no blank white screen              |
| TC-HOME-02 | P2       | Click hero CTA buttons       | Valid destination (products/collection/contact)          |
| TC-HOME-03 | P2       | Click featured product cards | Opens correct product detail page                        |
| TC-HOME-04 | P2       | Click category blocks        | Opens category/collection listing                        |
| TC-HOME-05 | P3       | Verify Instagram carousel    | 6 slides visible on large desktop; swipe works on mobile |

---

### 5.3 Product catalog (`/products`)

**Purpose:** Full product listing with filters, sort, pagination.

**Query parameters:** `page`, `sort`, `q` (search), `category`, `fabric`, `color`, `size`, `stock`, `minPrice`, `maxPrice`

| ID        | Priority | Steps                                    | Expected                                                           |
| --------- | -------- | ---------------------------------------- | ------------------------------------------------------------------ |
| TC-CAT-01 | P1       | Open `/products` as guest                | Grid of products; **prices hidden** (“Login for price” or similar) |
| TC-CAT-02 | P1       | Open `/products` as **approved client**  | **Prices visible** in INR                                          |
| TC-CAT-03 | P2       | Apply category filter                    | List updates; URL reflects filter                                  |
| TC-CAT-04 | P2       | Apply “in stock” / “out of stock” filter | Only matching products shown                                       |
| TC-CAT-05 | P2       | Change sort (e.g. price, newest)         | Order changes                                                      |
| TC-CAT-06 | P2       | Go to page 2 via pagination              | Page 2 loads; browser back returns to page 1                       |
| TC-CAT-07 | P2       | Click product card                       | Opens `/products/[slug]`                                           |

---

### 5.4 Product detail page (`/products/[slug]`)

**Purpose:** Single product — images, colors, set quantity, size run, add to cart, wishlist, compare.

**Notes:**

- Orders are in **sets** (default size run: S, M, L, XL, XXL, 3XL, 4XL, 5XL unless product specifies otherwise).
- **Sold out** products must not allow add to cart.

| ID        | Priority | Steps                                            | Expected                                                      |
| --------- | -------- | ------------------------------------------------ | ------------------------------------------------------------- |
| TC-PDP-01 | P1       | Open any in-stock product as guest               | Images load; price hidden; Add to cart may work locally       |
| TC-PDP-02 | P1       | Same product as approved client                  | Price visible; set price updates when color/qty changes       |
| TC-PDP-03 | P1       | Increase quantity, click Add to cart             | Item appears in mini cart; count in header updates            |
| TC-PDP-04 | P2       | Change color variant                             | Image/price updates if applicable                             |
| TC-PDP-05 | P2       | Click wishlist heart                             | Wishlist count increases; item in wishlist panel              |
| TC-PDP-06 | P2       | Add to compare (max 3 products)                  | Compare drawer shows product; 4th compare blocked or replaced |
| TC-PDP-07 | P1       | Open **sold out** product                        | “Out of stock” shown; add to cart disabled                    |
| TC-PDP-08 | P2       | Invalid slug `/products/this-does-not-exist-xyz` | Custom 404 page (not generic server error)                    |

**SEO category hubs (not a single product):**

- `/products/shirts`, `/products/kurtas`, `/products/jackets` → filtered listing pages. Verify they list products, not a broken PDP.

---

### 5.5 Collections and categories

| Path                                             | Purpose                   |
| ------------------------------------------------ | ------------------------- |
| `/collections`                                   | Collection index          |
| `/collections/ajrakh`, `/mashru`, `/block-print` | Curated listings          |
| `/categories`                                    | Category hub index        |
| `/categories/[slug]`                             | CMS category landing page |

| ID         | Priority | Steps                             | Expected                        |
| ---------- | -------- | --------------------------------- | ------------------------------- |
| TC-COLL-01 | P2       | Open each collection link         | Products relevant to collection |
| TC-COLL-02 | P2       | Open `/categories` and a sub-page | Hero + product links work       |

---

### 5.6 Search

| Entry point                | Behavior                              |
| -------------------------- | ------------------------------------- |
| Header search              | Usually goes to `/products?q=keyword` |
| `/search-result?q=keyword` | Dedicated search results page         |

| ID         | Priority | Steps                            | Expected                                    |
| ---------- | -------- | -------------------------------- | ------------------------------------------- |
| TC-SRCH-01 | P2       | Search “ajrakh” from header      | Relevant products                           |
| TC-SRCH-02 | P2       | Search nonsense string “zzzxxyy” | Empty state message, no crash               |
| TC-SRCH-03 | P3       | Open `/search-result?q=shirt`    | Same or consistent results as header search |

---

### 5.7 Cart (`/cart` or `/shopping-cart`)

**Purpose:** Review cart lines, quantities, subtotal, GST (for B2B), proceed to checkout.

**Technical note:** Guest cart lives in **browser local storage**. Approved client cart also syncs to **server**.

| ID         | Priority | Steps                                                | Expected                                                             |
| ---------- | -------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| TC-CART-01 | P1       | Add 2 different products; open `/cart`               | Both lines show with image, name, qty                                |
| TC-CART-02 | P1       | Increase/decrease quantity                           | Line total updates                                                   |
| TC-CART-03 | P1       | Remove one line                                      | Line disappears; **does not reappear** after 5 seconds (no API loop) |
| TC-CART-04 | P2       | Guest cart                                           | Subtotal may show but GST hidden or N/A                              |
| TC-CART-05 | P2       | Approved client cart                                 | GST line visible if applicable                                       |
| TC-CART-06 | P1       | Open cart page; watch Network tab (F12) 30 sec       | `/api/cart` should **not** fire continuously in a loop               |
| TC-CART-07 | P2       | Login as approved client after adding items as guest | Cart merges or syncs sensibly (document behavior)                    |

---

### 5.8 Wishlist (`/wishlist`)

| ID         | Priority | Steps                                        | Expected                                      |
| ---------- | -------- | -------------------------------------------- | --------------------------------------------- |
| TC-WISH-01 | P2       | Add 3 products to wishlist; open `/wishlist` | All 3 visible with images                     |
| TC-WISH-02 | P1       | Open wishlist on mobile Chrome               | Page loads; **no “page unresponsive”** freeze |
| TC-WISH-03 | P2       | Remove item from wishlist page               | Item removed; header count updates            |

---

### 5.9 Compare (`/compare-products`)

| ID        | Priority | Steps                                       | Expected                             |
| --------- | -------- | ------------------------------------------- | ------------------------------------ |
| TC-CMP-01 | P2       | Compare 2–3 products via `?ids=slug1,slug2` | Comparison table loads               |
| TC-CMP-02 | P3       | Try 4th product in compare                  | Blocked or oldest removed (document) |

---

### 5.10 Registration (`/register`)

**Purpose:** New wholesale account application.

**Required:** Company name, contact, email, phone, GSTIN, state/city, password, email OTP, GST verification (portal or manual fallback).

| ID        | Priority | Steps                                    | Expected                                                 |
| --------- | -------- | ---------------------------------------- | -------------------------------------------------------- |
| TC-REG-01 | P1       | Complete registration with **new** email | OTP sends; GST validates or manual path works            |
| TC-REG-02 | P1       | Submit valid form                        | Redirect to `/registration-thank-you`; **no auto-login** |
| TC-REG-03 | P1       | Try login immediately with new account   | **Blocked** — pending approval message                   |
| TC-REG-04 | P2       | Duplicate email                          | Clear error                                              |
| TC-REG-05 | P2       | Invalid GST format                       | Validation error                                         |
| TC-REG-06 | P2       | Mismatched password / confirm            | Validation error                                         |

---

### 5.11 Login / logout (`/login`)

| ID          | Priority | Steps                                 | Expected                                  |
| ----------- | -------- | ------------------------------------- | ----------------------------------------- |
| TC-LOGIN-01 | P1       | Login as **approved** client          | Redirect to `/my-account` or `?next=` URL |
| TC-LOGIN-02 | P1       | Login as **pending** client           | Error: under review (no session)          |
| TC-LOGIN-03 | P1       | Wrong password                        | Error message; no login                   |
| TC-LOGIN-04 | P2       | Visit `/login` when already logged in | Redirect to account                       |
| TC-LOGIN-05 | P2       | Logout from account menu              | Session cleared; prices hidden again      |
| TC-LOGIN-06 | P2       | `/forgot-password`                    | Reset email flow or form works            |

---

### 5.12 Checkout (`/checkout`)

**Purpose:** Submit **order request** (B2B). Not a payment gateway checkout.

| ID        | Priority | Steps                                                      | Expected                                     |
| --------- | -------- | ---------------------------------------------------------- | -------------------------------------------- |
| TC-CHK-01 | P1       | Checkout as **guest** with items in cart                   | Cannot complete order; login/register prompt |
| TC-CHK-02 | P1       | Checkout as **approved** client with valid address/pincode | Order submits; redirect to confirmation      |
| TC-CHK-03 | P2       | Invalid pincode for selected state                         | Validation error before submit               |
| TC-CHK-04 | P2       | Empty cart checkout                                        | Blocked or redirect to cart                  |
| TC-CHK-05 | P2       | After success                                              | Cart cleared; confirmation shows order ID    |

---

### 5.13 Order confirmation and tracking

| Path                             | Purpose                          |
| -------------------------------- | -------------------------------- |
| `/payment-confirmation?orderId=` | Success page after checkout      |
| `/payment-failure`               | Failure fallback                 |
| `/order-tracking`                | Guest lookup by Order ID + email |

| ID        | Priority | Steps                                  | Expected                           |
| --------- | -------- | -------------------------------------- | ---------------------------------- |
| TC-ORD-01 | P2       | Open confirmation with valid `orderId` | Order details or thank-you message |
| TC-ORD-02 | P2       | Track order with ID + billing email    | Status shown                       |
| TC-ORD-03 | P2       | Wrong email for order ID               | Error, no data leak                |

---

### 5.14 My account (requires login — middleware protected)

| Path                                  | Purpose            |
| ------------------------------------- | ------------------ |
| `/my-account` or `/profile`           | Dashboard          |
| `/my-account-orders`                  | Order list         |
| `/my-account-orders-details?orderId=` | Single order       |
| `/my-account-address`                 | Address + GST      |
| `/my-account-testimonials`            | Submit testimonial |

| ID        | Priority | Steps                                         | Expected                                         |
| --------- | -------- | --------------------------------------------- | ------------------------------------------------ |
| TC-ACC-01 | P1       | Open `/my-account` as guest                   | Redirect to `/login?next=...`                    |
| TC-ACC-02 | P1       | Open each account sub-page as approved client | Pages load; data consistent with orders          |
| TC-ACC-03 | P2       | Update address on `/my-account-address`       | Saves; used on next checkout                     |
| TC-ACC-04 | P2       | Submit testimonial                            | Success message; appears in admin after approval |

---

### 5.15 Blog (`/blog`, `/blog/[slug]`)

| ID         | Priority | Steps                                          | Expected                                          |
| ---------- | -------- | ---------------------------------------------- | ------------------------------------------------- |
| TC-BLOG-01 | P2       | Open blog list                                 | Posts paginate                                    |
| TC-BLOG-02 | P2       | Open article                                   | Content, images, share bar                        |
| TC-BLOG-03 | P2       | Submit comment as guest (name, email, message) | Success; comment **pending** until admin approves |
| TC-BLOG-04 | P3       | Share buttons                                  | Open correct share intent/URL                     |

---

### 5.16 Contact and inquiry

| Path       | Purpose                      |
| ---------- | ---------------------------- |
| `/contact` | Contact page + form          |
| `/inquiry` | Standalone wholesale inquiry |

| ID         | Priority | Steps                               | Expected                                                         |
| ---------- | -------- | ----------------------------------- | ---------------------------------------------------------------- |
| TC-CONT-01 | P2       | Submit contact form with valid data | Success message; admin receives inquiry (verify with admin user) |
| TC-CONT-02 | P2       | Submit with invalid email           | Validation error                                                 |
| TC-CONT-03 | P2       | Map/directions link                 | Opens Google Maps or valid URL                                   |

---

### 5.17 Newsletter

| ID         | Priority | Steps                                                               | Expected                              |
| ---------- | -------- | ------------------------------------------------------------------- | ------------------------------------- |
| TC-NEWS-01 | P2       | Subscribe from footer with new email                                | Success message                       |
| TC-NEWS-02 | P2       | Subscribe same email twice                                          | Sensible message (already subscribed) |
| TC-NEWS-03 | P2       | Open unsubscribe link from email (`/newsletter/unsubscribe?token=`) | Unsubscribe confirmed                 |

---

### 5.18 Static / policy pages

Verify each loads and readable (no 404):

- `/about`
- `/process`
- `/infrastructure`
- `/certifications`
- `/faqs` (also `/FAQs` should work)
- `/privacy-policy`
- `/term-of-use` (`/terms` redirects here)
- `/refund-policy`
- `/shipping-policy`
- `/product-out-of-stock`
- `/order-feedback`
- `/site-map`
- `/site/[custom-slug]` — use a slug provided in test data sheet

| ID           | Priority | Steps                    | Expected                |
| ------------ | -------- | ------------------------ | ----------------------- |
| TC-STATIC-01 | P3       | Open each URL above      | 200 OK, content renders |
| TC-STATIC-02 | P3       | Check mobile readability | No text cut off         |

---

## 6. Admin panel (backend) — overview

### 6.1 What the admin panel is

A **password-protected** internal dashboard at `/admin` for staff to:

- Approve wholesale clients
- Manage products, stock, and pricing
- Process orders, dispatch, and payments
- Edit website content (home, about, contact, blogs, SEO)
- Send newsletters
- View reports and audit logs
- Backup/restore CMS data (super admin)

### 6.2 Login

| Item    | Detail                                 |
| ------- | -------------------------------------- |
| URL     | `/admin/login`                         |
| Session | 8 hours; cookie `sarjan-admin-session` |
| Logout  | Sidebar or `/api/admin/auth/logout`    |

| ID              | Priority | Steps                         | Expected                          |
| --------------- | -------- | ----------------------------- | --------------------------------- |
| TC-ADM-LOGIN-01 | P1       | Valid admin credentials       | Redirect to `/admin` dashboard    |
| TC-ADM-LOGIN-02 | P1       | Invalid password              | Error on login page               |
| TC-ADM-LOGIN-03 | P2       | Open `/admin` without login   | Redirect to login                 |
| TC-ADM-LOGIN-04 | P2       | “Front Store” link in sidebar | Opens public site in same/new tab |

### 6.3 Roles and access control (must test)

The sidebar shows **all menu items to every role**, but **middleware blocks** unauthorized pages.

When testing a limited role (e.g. **Content**), click **every** sidebar link and record:

- **Pass:** page loads
- **Fail:** redirect to dashboard `/admin` or blank forbidden behavior

| Role            | Should access (high level)                 | Must NOT access (examples)          |
| --------------- | ------------------------------------------ | ----------------------------------- |
| **super_admin** | All modules                                | —                                   |
| **admin**       | All except some super-only                 | backups, roles (verify)             |
| **sales**       | Clients, orders, pricing, reports, account | CMS home, inventory, payments       |
| **dispatch**    | Dispatch, orders, inventory, reports       | CMS, clients create, payments       |
| **accounts**    | Payments, reports, orders (payment fields) | CMS, products create                |
| **content**     | CMS, products, blogs, SEO, newsletter      | Orders, dispatch, payments, pricing |

| ID         | Priority | Steps                                        | Expected                     |
| ---------- | -------- | -------------------------------------------- | ---------------------------- |
| TC-RBAC-01 | P1       | For each role account, open `/admin/backups` | Only **super_admin** allowed |
| TC-RBAC-02 | P1       | Content user opens `/admin/orders`           | Redirect or block            |
| TC-RBAC-03 | P1       | Sales user opens `/admin/customers`          | Allowed                      |
| TC-RBAC-04 | P2       | Dispatch user opens `/admin/products-low`    | Allowed                      |
| TC-RBAC-05 | P2       | Accounts user opens `/admin/payments`        | Allowed                      |

---

## 7. Admin modules — detailed test cases

### 7.1 Dashboard (`/admin`)

**Purpose:** KPIs, charts, recent orders, alerts.

| ID             | Priority | Steps              | Expected                          |
| -------------- | -------- | ------------------ | --------------------------------- |
| TC-ADM-DASH-01 | P2       | Load dashboard     | Charts/cards load without error   |
| TC-ADM-DASH-02 | P2       | Click recent order | Opens order detail or orders list |

---

### 7.2 Customer management (`/admin/customers`)

**Purpose:** List B2B clients; approve/reject pending; edit profile; view order history; export PDF.

| ID           | Priority | Steps                                        | Expected                              |
| ------------ | -------- | -------------------------------------------- | ------------------------------------- |
| TC-ADM-CL-01 | P1       | Find **pending** registration from TC-REG-01 | Client visible with pending status    |
| TC-ADM-CL-02 | P1       | **Approve** pending client                   | Status = approved                     |
| TC-ADM-CL-03 | P1       | Client logs in on storefront                 | Login succeeds                        |
| TC-ADM-CL-04 | P2       | **Reject** a test client                     | Login blocked with rejection message  |
| TC-ADM-CL-05 | P2       | Edit client GST/address                      | Saves; reflects on storefront account |
| TC-ADM-CL-06 | P2       | Export client PDF                            | File downloads                        |

---

### 7.3 Orders (`/admin/orders`)

**Purpose:** View/filter orders; change approval status; edit line items; add notes.

| ID            | Priority | Steps                                   | Expected                                        |
| ------------- | -------- | --------------------------------------- | ----------------------------------------------- |
| TC-ADM-ORD-01 | P1       | Find order from checkout test           | Order present with correct items/qty            |
| TC-ADM-ORD-02 | P1       | Change approval status (approve/reject) | Saves; client sees updated status if applicable |
| TC-ADM-ORD-03 | P2       | Filter by status/date                   | Filters work                                    |
| TC-ADM-ORD-04 | P2       | Add internal note                       | Saves                                           |

---

### 7.4 Dispatch (`/admin/dispatch`)

**Purpose:** Dispatch-focused view — dates, transport, LR number, courier, vehicle, tracking history.

| ID            | Priority | Steps                            | Expected                                      |
| ------------- | -------- | -------------------------------- | --------------------------------------------- |
| TC-ADM-DSP-01 | P2       | Open approved order              | Dispatch fields editable                      |
| TC-ADM-DSP-02 | P2       | Enter LR + courier; save         | Data persists on reload                       |
| TC-ADM-DSP-03 | P2       | Client views order on storefront | Tracking/dispatch info visible if implemented |

---

### 7.5 Payments (`/admin/payments`)

**Purpose:** Payment status, paid amount, cheque details, deposit status.

| ID            | Priority | Steps                           | Expected |
| ------------- | -------- | ------------------------------- | -------- |
| TC-ADM-PAY-01 | P2       | Mark payment received partially | Saves    |
| TC-ADM-PAY-02 | P2       | Enter cheque number/date        | Saves    |

---

### 7.6 Inventory (`/admin/products-low`)

**Purpose:** Stock levels; movements (add, reduce, adjust, return, damage).

| ID            | Priority | Steps                            | Expected                            |
| ------------- | -------- | -------------------------------- | ----------------------------------- |
| TC-ADM-INV-01 | P2       | View low stock list              | Products below threshold listed     |
| TC-ADM-INV-02 | P2       | Add stock movement               | Quantity updates; log entry created |
| TC-ADM-INV-03 | P1       | Product at 0 stock on storefront | Shows sold out                      |

---

### 7.7 Products (`/admin/products-list`, `/admin/products-create`)

**Purpose:** Create/edit/delete products; bulk Excel import preview.

| ID           | Priority | Steps                                          | Expected                      |
| ------------ | -------- | ---------------------------------------------- | ----------------------------- |
| TC-ADM-PR-01 | P1       | Create new test product with images            | Saves; appears on `/products` |
| TC-ADM-PR-02 | P1       | Edit product title/price/slug                  | Saves; PDP updates            |
| TC-ADM-PR-03 | P2       | Delete/archive test product                    | Removed from catalog          |
| TC-ADM-PR-04 | P2       | Bulk import preview (Excel sample if provided) | Preview rows without crash    |

---

### 7.8 Client pricing (`/admin/pricing`)

**Purpose:** Per-client discounts and special prices.

| ID            | Priority | Steps                                       | Expected                                    |
| ------------- | -------- | ------------------------------------------- | ------------------------------------------- |
| TC-ADM-PRC-01 | P1       | Set special price for test client + product | Approved client sees different price on PDP |
| TC-ADM-PRC-02 | P2       | Set category-level rule                     | Applies to multiple products                |

---

### 7.9 Reports (`/admin/reports`)

**Purpose:** Export orders, clients, inventory, finance, dispatch reports (CSV/XLSX/PDF).

| ID            | Priority | Steps                     | Expected                  |
| ------------- | -------- | ------------------------- | ------------------------- |
| TC-ADM-RPT-01 | P2       | Generate each report type | File downloads; not empty |
| TC-ADM-RPT-02 | P3       | Date range filter         | Data scoped correctly     |

---

### 7.10 Order feedback / inquiries (`/admin/contact-inquiries`)

**Purpose:** Contact form submissions; reply by email; mark replied.

| ID            | Priority | Steps                        | Expected                              |
| ------------- | -------- | ---------------------------- | ------------------------------------- |
| TC-ADM-INQ-01 | P2       | Find inquiry from TC-CONT-01 | Listed                                |
| TC-ADM-INQ-02 | P2       | Send reply email             | Status updated; email sent if SMTP on |

---

### 7.11 Commerce hub (`/admin/commerce-hub`) — super_admin / admin only

**Purpose:** Risk signals — duplicate orders, rapid orders, credit alerts.

| ID            | Priority | Steps      | Expected              |
| ------------- | -------- | ---------- | --------------------- |
| TC-ADM-HUB-01 | P3       | Page loads | Widgets/cards visible |

---

### 7.12 Home page CMS (`/admin/home`)

**Purpose:** Edit homepage sections — hero, categories, marquee, featured, Instagram gallery title, custom blocks.

| ID              | Priority | Steps                                    | Expected                                     |
| --------------- | -------- | ---------------------------------------- | -------------------------------------------- |
| TC-ADM-CMS-H-01 | P1       | Change hero headline text; save          | Public homepage shows new text after refresh |
| TC-ADM-CMS-H-02 | P2       | Reorder or toggle section (if UI allows) | Homepage reflects change                     |
| TC-ADM-CMS-H-03 | P2       | Upload hero image/video                  | Media displays on site                       |

---

### 7.13 Header menu (`/admin/header-menu`)

| ID             | Priority | Steps              | Expected                      |
| -------------- | -------- | ------------------ | ----------------------------- |
| TC-ADM-MENU-01 | P2       | Add/edit menu item | Storefront header nav updates |

---

### 7.14 About / Contact CMS (`/admin/about`, `/admin/contact`)

| ID           | Priority | Steps                | Expected                       |
| ------------ | -------- | -------------------- | ------------------------------ |
| TC-ADM-PG-01 | P2       | Edit paragraph; save | `/about` or `/contact` updated |

---

### 7.15 Blogs (`/admin/blogs-list`, `/admin/blogs-create`)

| ID             | Priority | Steps                       | Expected                          |
| -------------- | -------- | --------------------------- | --------------------------------- |
| TC-ADM-BLOG-01 | P2       | Create draft/published post | Appears on `/blog` when published |
| TC-ADM-BLOG-02 | P2       | Delete test post            | Removed from list                 |

---

### 7.16 Blog comments (`/admin/blog-comments`)

| ID            | Priority | Steps                           | Expected                    |
| ------------- | -------- | ------------------------------- | --------------------------- |
| TC-ADM-CMT-01 | P1       | Approve comment from TC-BLOG-03 | Visible on public blog post |
| TC-ADM-CMT-02 | P2       | Reject/delete comment           | Not visible publicly        |
| TC-ADM-CMT-03 | P2       | Admin reply                     | Reply shows on blog         |

---

### 7.17 Testimonials (`/admin/testimonials`)

| ID            | Priority | Steps                      | Expected                    |
| ------------- | -------- | -------------------------- | --------------------------- |
| TC-ADM-TST-01 | P2       | Approve client testimonial | Shows on site if configured |

---

### 7.18 Newsletter (`/admin/newsletter`)

**Purpose:** Subscriber list, email templates, send campaign, preview.

| ID           | Priority | Steps                            | Expected                         |
| ------------ | -------- | -------------------------------- | -------------------------------- |
| TC-ADM-NL-01 | P2       | View subscribers                 | Includes email from TC-NEWS-01   |
| TC-ADM-NL-02 | P2       | Preview template                 | HTML preview renders             |
| TC-ADM-NL-03 | P2       | Send test campaign to test email | Email received (if SMTP enabled) |
| TC-ADM-NL-04 | P2       | Unsubscribe link in email works  | TC-NEWS-03                       |

---

### 7.19 Category pages (`/admin/category-pages`)

| ID            | Priority | Steps             | Expected                     |
| ------------- | -------- | ----------------- | ---------------------------- |
| TC-ADM-CAT-01 | P2       | Edit category hub | `/categories/[slug]` updated |

---

### 7.20 Custom pages (`/admin/custom-pages`)

| ID             | Priority | Steps                                | Expected                   |
| -------------- | -------- | ------------------------------------ | -------------------------- |
| TC-ADM-CUST-01 | P2       | Create page with slug `qa-test-page` | `/site/qa-test-page` loads |

---

### 7.21 Product filters (`/admin/product-filters`)

| ID            | Priority | Steps                     | Expected            |
| ------------- | -------- | ------------------------- | ------------------- |
| TC-ADM-FLT-01 | P2       | Change filter label/order | Shop filters update |

---

### 7.22 SEO (`/admin/seo`)

| ID            | Priority | Steps                       | Expected                                     |
| ------------- | -------- | --------------------------- | -------------------------------------------- |
| TC-ADM-SEO-01 | P2       | Set meta title for homepage | View page source / SEO extension shows title |

---

### 7.23 AI Product Studio (`/admin/ai-product-studio`) — admin only

**Purpose:** Upload raw photos; AI processing; approve outputs.

| ID           | Priority | Steps                                       | Expected                                       |
| ------------ | -------- | ------------------------------------------- | ---------------------------------------------- |
| TC-ADM-AI-01 | P3       | Upload sample image (if AI keys configured) | Job processes or clear error if not configured |
| TC-ADM-AI-02 | P3       | Non-admin role opens URL                    | Blocked                                        |

---

### 7.24 Account & security (`/admin/account`)

| ID            | Priority | Steps                                             | Expected                                       |
| ------------- | -------- | ------------------------------------------------- | ---------------------------------------------- |
| TC-ADM-ACC-01 | P2       | Change display name                               | Saves; header shows new name                   |
| TC-ADM-ACC-02 | P1       | Change password (eye toggle shows/hides password) | Success message; login with new password works |
| TC-ADM-ACC-03 | P1       | Wrong current password                            | Error message (not generic “Network error”)    |

---

### 7.25 Roles (`/admin/roles`) — super_admin only

| ID             | Priority | Steps                   | Expected       |
| -------------- | -------- | ----------------------- | -------------- |
| TC-ADM-ROLE-01 | P3       | View permissions matrix | Readable table |

---

### 7.26 Backups (`/admin/backups`) — super_admin only

| ID            | Priority | Steps                                       | Expected            |
| ------------- | -------- | ------------------------------------------- | ------------------- |
| TC-ADM-BAK-01 | P2       | Create backup                               | Download link works |
| TC-ADM-BAK-02 | P3       | Restore on **staging only** (if instructed) | Site data restores  |

---

### 7.27 Audit logs (`/admin/audit`)

| ID            | Priority | Steps                          | Expected                       |
| ------------- | -------- | ------------------------------ | ------------------------------ |
| TC-ADM-AUD-01 | P3       | Filter logs after product edit | Entry present with actor email |

---

### 7.28 Notifications (header bell)

| ID            | Priority | Steps                         | Expected                                  |
| ------------- | -------- | ----------------------------- | ----------------------------------------- |
| TC-ADM-NOT-01 | P2       | Place new order on storefront | Bell shows new notification (within ~30s) |
| TC-ADM-NOT-02 | P2       | Mark all read                 | Clears unread state                       |

---

## 8. End-to-end flows (cross-system)

Run these **after** individual modules pass.

| ID     | Flow                | Steps summary                                                                                | Expected                  |
| ------ | ------------------- | -------------------------------------------------------------------------------------------- | ------------------------- |
| E2E-01 | **New B2B buyer**   | Register → admin approve → login → see prices → add to cart → checkout → admin approve order | Full path without blocker |
| E2E-02 | **Dispatch**        | Approved order → dispatch fills LR → client tracks order                                     | Tracking info consistent  |
| E2E-03 | **Content publish** | Admin edits homepage hero → hard refresh storefront                                          | Change live               |
| E2E-04 | **Blog moderation** | Guest comment → admin approve → visible on blog                                              | Comment public            |
| E2E-05 | **Pricing**         | Admin sets client price → client sees price on PDP and cart                                  | Numbers match             |
| E2E-06 | **Stock**           | Admin sets stock 0 → PDP sold out → cannot checkout that SKU                                 | Consistent                |
| E2E-07 | **Newsletter**      | Footer subscribe → admin send campaign → unsubscribe                                         | Full email cycle          |

---

## 9. Performance and stability checks

| ID      | Check             | How                           | Pass criteria                  |
| ------- | ----------------- | ----------------------------- | ------------------------------ |
| PERF-01 | Homepage load     | Mobile 4G throttle (DevTools) | Usable within 15s              |
| PERF-02 | Cart API loop     | Network tab on cart page 30s  | No endless `/api/cart` calls   |
| PERF-03 | Wishlist mobile   | Open wishlist on phone        | No browser freeze              |
| PERF-04 | Admin orders list | 500+ orders env if available  | Page still usable or paginates |

---

## 10. Security smoke tests (non-expert)

| ID     | Test                                                         | Expected                     |
| ------ | ------------------------------------------------------------ | ---------------------------- |
| SEC-01 | `/admin` without login                                       | Redirect login               |
| SEC-02 | `/my-account` without login                                  | Redirect login               |
| SEC-03 | SQL injection in search `?q=' OR 1=1--`                      | No error dump; safe handling |
| SEC-04 | XSS in blog comment `<script>alert(1)</script>`              | Escaped/not executed         |
| SEC-05 | Pending client cannot access `/api/orders` POST via DevTools | 401/403                      |

---

## 11. Known limitations (not bugs unless spec says otherwise)

1. **No guest checkout** — by design; guests must register and get approved.
2. **Prices hidden** until B2B approval — by design.
3. **Payment** is order request + offline cheque/credit — not Razorpay/Stripe on checkout.
4. **Instagram feed** may use cached local images if Meta API token not configured.
5. **Admin sidebar** shows all links; unauthorized roles are blocked on click.
6. **Two search URLs** (`/products?q=` and `/search-result`) — both valid.

---

## 12. Test execution plan (suggested order)

| Phase       | Days    | Focus                                                           |
| ----------- | ------- | --------------------------------------------------------------- |
| **Phase 1** | Day 1–2 | Storefront guest: browse, search, cart, wishlist, static pages  |
| **Phase 2** | Day 2–3 | Registration, login states, approved client, checkout           |
| **Phase 3** | Day 3–4 | Account area, blog, contact, newsletter                         |
| **Phase 4** | Day 4–6 | Admin: clients, orders, dispatch, payments, inventory, products |
| **Phase 5** | Day 6–7 | Admin: CMS, blogs, newsletter, SEO                              |
| **Phase 6** | Day 7–8 | RBAC per role, E2E flows, regression                            |
| **Phase 7** | Day 8   | Sign-off report                                                 |

---

## 13. Sign-off checklist

Tester completes and sends to project owner:

- [ ] All **P1** test cases executed
- [ ] All **P2** test cases executed or explicitly skipped with reason
- [ ] E2E-01 through E2E-07 executed
- [ ] RBAC tested for every role account provided
- [ ] Mobile + desktop smoke done
- [ ] Bug list exported with template from Section 4
- [ ] **Open P1 count:** **\_\_**
- [ ] **Recommendation:** Pass / Pass with issues / Fail

**Tester name:** **\*\*\*\***\_\_\_\_**\*\*\*\***  
**Date:** **\*\*\*\***\_\_\_\_**\*\*\*\***  
**Build/version tested:** **\*\*\*\***\_\_\_\_**\*\*\*\***  
**Environment URL:** **\*\*\*\***\_\_\_\_**\*\*\*\***

---

## 14. Appendix — quick URL reference

### Storefront

```
/                          Homepage
/products                  Catalog
/products/{slug}           Product detail
/cart                      Cart
/checkout                  Checkout
/login, /register          Auth
/my-account                Account (protected)
/wishlist                  Wishlist
/blog                      Blog
/contact                   Contact
/order-tracking            Track order
```

### Admin

```
/admin/login               Admin login
/admin                     Dashboard
/admin/customers           Clients
/admin/orders              Orders
/admin/dispatch            Dispatch
/admin/payments            Payments
/admin/products-list       Products
/admin/products-low        Inventory
/admin/pricing             Client pricing
/admin/home                Home CMS
/admin/newsletter          Newsletter
/admin/account             Account settings
```

---

_End of document — copy into Google Docs and fill Section 3 credentials table from your secure handover sheet._
