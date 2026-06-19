# Sarjan AI — Implementation Guide (Web + Mobile)

Sarjan AI is Sarjan Textiles’ **B2B wholesale order assistant**. In code it is often called **Order Bot**; in the UI it appears as **Sarjan AI**.

Both **web** (Next.js storefront) and **mobile** (React Native app) talk to the **same backend APIs** on the Sarjan Textiles server. The mobile app is a native client; the web widget runs inside every storefront page.

---

## Table of contents

1. [High-level architecture](#high-level-architecture)
2. [Who can use what](#who-can-use-what)
3. [Web implementation](#web-implementation)
4. [Mobile implementation](#mobile-implementation)
5. [Shared backend APIs](#shared-backend-apis)
6. [Feature comparison](#feature-comparison)
7. [End-to-end flows](#end-to-end-flows)
8. [Key files index](#key-files-index)
9. [Local development](#local-development)
10. [Testing](#testing)

---

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User devices                             │
├──────────────────────────┬──────────────────────────────────────┤
│  Web (Next.js)           │  Mobile (React Native)                │
│  OrderBotWidget          │  SarjanAiFab + SarjanAiSheet          │
│  ModaveShell (global)    │  SarjanAiContext (tab navigator)    │
└────────────┬─────────────┴──────────────────┬───────────────────┘
             │                                 │
             │   HTTPS  /api/client/order-bot/* │
             │   HTTPS  /api/auth/*             │
             └─────────────────┬───────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Sarjan Textiles backend (Next.js API routes)                    │
├─────────────────────────────────────────────────────────────────┤
│  order-bot/engine.ts      Rule-based + LLM chat handlers         │
│  order-bot/llm-agent.ts   OpenAI tool calling (optional)         │
│  order-bot/actions.ts     Cart actions, place order              │
│  visual-search.ts         Image → product matching (vision)      │
│  ai-chat/store.ts         Sessions, messages, prefs, analytics   │
│  ai-auth/flow.ts          Guest register/login conversation      │
└─────────────────────────────────────────────────────────────────┘
```

**Design principles**

- **Hybrid intelligence:** Deterministic handlers run first (cart, policies, page context). OpenAI LLM + tools are used when enabled and needed.
- **B2B gate:** Full catalog, cart, visual search, and order placement require an **approved wholesale client** account.
- **Shared order pipeline:** AI orders use the same `createOrder()` path as checkout, tagged `placedVia: "ai_bot"`.
- **Two session layers:** In-memory bot session (cart, last products) + persisted AI chat session (analytics, rating, resume).

---

## Who can use what

| User state                    | Web                                                             | Mobile                                    |
| ----------------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| **Guest** (not logged in)     | Welcome + Register / Login chips; conversational auth in widget | Same; local auth wizard, no order-bot API |
| **Pending approval**          | Gate message; no catalog/cart AI                                | Same                                      |
| **Rejected / inactive**       | Gate message                                                    | Same                                      |
| **Approved wholesale client** | Full AI: chat, visual search, cart, place order                 | Full AI via `/api/client/order-bot/*`     |

After successful login with `status === "approved"`, the client bootstraps a full order-bot session and shows approved quick actions (Browse Products, Track Orders, Place Order, Contact Team).

---

## Web implementation

### Where it lives

| Piece                                 | Path                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Main UI widget                        | `src/components/storefront/OrderBotWidget.tsx`                                           |
| Rich cards, OTP, GST, language picker | `src/components/storefront/OrderBotVisuals.tsx`                                          |
| Confetti overlay                      | `src/components/storefront/OrderConfettiLayer.tsx`                                       |
| Mounted globally                      | `src/components/storefront/ModaveShell.tsx`                                              |
| API client                            | `src/lib/order-bot-client.ts`                                                            |
| Chat engine                           | `src/lib/order-bot/engine.ts`                                                            |
| LLM agent                             | `src/lib/order-bot/llm-agent.ts`                                                         |
| Guest auth flow                       | `src/lib/ai-auth/flow.ts`, `browser.ts`                                                  |
| Welcome + quick actions               | `src/lib/ai-chat/welcome.ts`                                                             |
| Page context bridges                  | `ProductAiContextBridge.tsx`, `CartAiContextBridge.tsx`, `SarjanAiPageContextBridge.tsx` |

### How the widget opens

1. `ModaveShell` renders `OrderBotWidget` on every storefront page (floating **Sarjan AI** button, bottom-right).
2. On open, if the user is **approved**, `bootstrapApprovedSession()`:
   - Loads language preference (`GET /api/client/order-bot/preferences`)
   - Starts or resumes chat session (`POST /api/client/order-bot/session`)
   - Shows localized welcome + quick-action chips
3. If **guest**, shows welcome with **Register** / **Login** only.

### Chat flow

1. User types or taps a quick-reply chip.
2. Widget calls `POST /api/client/order-bot/chat` with `sessionId`, `message`, `language`, and optional **page context** (current product, cart, etc.).
3. Server runs `handleOrderBotMessage()`:
   - Pre-LLM handlers: cart commands, policies, “place order”, page-context Q&A
   - Optional LLM via `tryHandleOrderBotWithLlm()` (tools: search products, add to cart, place order, …)
4. Response includes `reply`, optional `products` / `cart` / `orders`, `quickReplies`, `navActions`.
5. Widget renders assistant bubble + product/cart cards; cart changes sync to storefront localStorage and header mini-cart.

### Page context (storefront awareness)

There is no React Context provider. Instead:

- **Product pages** → `ProductAiContextBridge` sends slug, price, MOQ, stock
- **Cart page** → `CartAiContextBridge` sends line count, pieces, subtotal
- **Hook** → `useOrderBotPageContext()` merges URL + bridged data
- Server uses context to answer “this product’s MOQ”, “price of this item”, etc. without calling the LLM

### Guest auth (Register / Login in chat)

Handled entirely inside the widget via `ai-auth/flow.ts`:

1. **Register:** Collects company name → GST (optional) → contact → mobile → email → city → state, one field at a time.
2. **GST:** If provided, `OrderBotGstCaptchaPanel` verifies via official GST portal captcha.
3. **OTP:** Email OTP via `POST /api/auth/send-otp` → verify → `POST /api/auth/agent-register`.
4. **Login:** Email → OTP → `POST /api/auth/login-otp` → client session persisted → full AI unlocked if approved.

### Visual search (web)

1. Approved user taps camera icon in composer.
2. Image uploaded to `POST /api/client/order-bot/visual-search` (multipart, max ~6 MB).
3. Server normalizes image (Sharp, 1280px JPEG) and runs vision + catalog matching.
4. Returns up to 6 product cards; user can add to cart via `POST /api/client/order-bot/action`.

### Order placement (web)

1. User says “Place order” or LLM calls `place_order` tool.
2. Server validates bot cart → `createOrder(..., { placedVia: "ai_bot" })`.
3. Widget on success:
   - Closes panel
   - Runs confetti (`runOrderConfetti()` + `OrderConfettiLayer`)
   - Shows toast with order link
   - Clears storefront cart and syncs with API

Orders display a **“Placed via AI”** badge in admin and order views.

### Languages (web)

Supported AI languages: **English**, **Hindi**, **Hinglish**.

- First approved session may show `OrderBotLanguagePicker` if no preference saved.
- Preference saved via `PATCH /api/client/order-bot/preferences`.
- Welcome copy, auth prompts, visual search replies, and rating prompts are localized.

### Inactivity & rating

- After **5 minutes** of inactivity (`AI_INACTIVITY_MS`), widget sends silent `__SARJAN_INACTIVITY__` to prompt session close / star rating.
- Rating submitted via `PATCH /api/client/order-bot/session`.

### Confetti (web)

Dual system:

- `canvas-confetti` burst via `order-celebration.ts`
- DOM confetti layer via `OrderConfettiLayer.tsx` (event bus `sarjan:order-confetti`)

Respects `prefers-reduced-motion`.

---

## Mobile implementation

### Where it lives

| Piece                      | Path                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| Context / state            | `src/context/SarjanAiContext.tsx`                                  |
| Full-screen chat sheet     | `src/components/ai/SarjanAiSheet.tsx`                              |
| FAB launcher               | `src/components/ai/SarjanAiFab.tsx`                                |
| Bottom sheet primitive     | `src/components/sheets/AppBottomSheet.tsx`                         |
| Order-bot API client       | `src/services/orderBotService.ts`                                  |
| Visual search picker       | `src/services/visualSearchService.ts`                              |
| Order celebration          | `src/services/aiOrderCelebration.ts`                               |
| Confetti overlay           | `src/components/system/CelebrationOverlay.tsx` (root in `App.tsx`) |
| Guest auth flow            | `src/lib/ai-auth/flow.ts`                                          |
| Quick action filtering     | `src/utils/aiQuickActions.ts`                                      |
| Bold text in bubbles       | `src/utils/aiMessageText.tsx`                                      |
| Sheet hide/wait for picker | `src/utils/sheetLifecycle.ts`                                      |
| Page context hook          | `src/hooks/useSarjanAiPageContext.ts`                              |
| Session persistence        | `src/services/sarjanAiStorage.ts` (AsyncStorage)                   |
| API base URL               | `src/constants/config.ts`                                          |

Wired in `src/navigation/MainTabNavigator.tsx`: tabs wrapped in `SarjanAiProvider`, FAB + sheet mounted globally.

### How the sheet opens

1. User taps **Sarjan AI** FAB on any main tab.
2. `openAi()` in `SarjanAiContext`:
   - **Guest** → `bootstrapGuestSession()` → language pick → welcome + Register/Login
   - **Approved** → `bootstrapApprovedSession()` → preferences + resume session from AsyncStorage
   - **Pending/rejected** → gate message, no backend chat

### Chat flow (mobile, approved)

Same API as web:

1. `sendMessage()` → `POST /api/client/order-bot/chat` with `pageContext` and `source: "app"`.
2. `applyBotResponse()` updates messages, chips, cart cards.
3. Product cards support **+25 / +50 / +100 sets** quick add.
4. `sendProductAction()` → `POST /api/client/order-bot/action`.

### Guest auth (mobile)

Mirrors web logic in `src/lib/ai-auth/flow.ts`:

- Step-by-step register/login in chat bubbles
- `SarjanAiGstPanel` for GST captcha
- `OtpPanel` for 6-digit email OTP
- **Cancel / Restart** buttons during auth
- On approved login → `bootstrapApprovedSession()`; guest chips cleared via `filterQuickActionsForApproved`

Safety net: if user is approved but chips still show Register/Login (session resume race), context auto-rebootstraps.

### Visual search (mobile)

**Important:** Camera/gallery requires hiding the sheet first (iOS `FullWindowOverlay` sits above native pickers).

Flow:

1. User taps camera in `ChatFooter` (approved only).
2. `setSheetSuspendedForPicker(true)` → sheet hides.
3. `waitUntilSheetHidden()` (max ~550 ms).
4. `pickSearchImage()` via `react-native-image-crop-picker`.
5. Sheet **restores immediately after picker closes** (before upload completes).
6. `POST /api/client/order-bot/visual-search` (90 s timeout).
7. Bot reply with matched products.

Separate path: **Search tab** visual search uses `POST /api/search/visual` (catalog grid, not chat).

### Order placement (mobile)

When bot response has `orderPlaced: true` + `orderId`:

1. `celebrateAiOrderPlaced()` — haptics + `react-native-confetti-cannon` via root `CelebrationOverlay`
2. Cart sync scheduled
3. Success toast
4. **`closeAi()`** — sheet closes so confetti appears above tab bar

Same celebration bus used by checkout `OrderSuccessScreen`.

### Markdown in chat bubbles

Not full markdown — only `**bold**` segments, rendered by `AiMessageText` (matches web `OrderBotWidget.renderBotText`).

### i18n (mobile)

Two layers:

| Layer               | Mechanism                                                                      |
| ------------------- | ------------------------------------------------------------------------------ |
| **App UI**          | `react-i18next` — `en.json`, `hi.json`, `gu.json` (`ai.*` keys)                |
| **AI conversation** | Separate `AiLanguage` (`en` / `hi` / `hinglish`) via order-bot preferences API |

App language maps to AI default: `hi → hi`, `gu → hinglish`, else `en`.

Guest auth wizard copy is inline in `flow.ts` (en/hi/hinglish), not i18n JSON.

### Sheet lifecycle (mobile-specific)

| Problem                 | Solution                                                        |
| ----------------------- | --------------------------------------------------------------- |
| Picker behind AI sheet  | Hide sheet before opening camera/gallery                        |
| Slow reopen after photo | `resumeAfterHideRef` in `AppBottomSheet` for instant re-present |
| Tab bar over sheet      | `fullWindowOverlay={true}` on bottom sheet                      |
| Context lost in portal  | `SarjanAiContextBridge` re-injects context inside overlay       |

---

## Shared backend APIs

### Client order-bot (approved users only)

All routes under `/api/client/order-bot/*` require an **approved client JWT**.

| Method  | Route            | Purpose                                                  |
| ------- | ---------------- | -------------------------------------------------------- |
| `POST`  | `/chat`          | Main conversational message                              |
| `POST`  | `/action`        | Card actions: `add_to_cart`, `view_product`              |
| `POST`  | `/visual-search` | Multipart image upload → product matches                 |
| `POST`  | `/session`       | Start or resume session; returns welcome + quick actions |
| `PATCH` | `/session`       | Close session or submit 1–5 star rating                  |
| `GET`   | `/preferences`   | Read saved AI language                                   |
| `PATCH` | `/preferences`   | Save AI language                                         |

### Auth (guests, used by both web widget and mobile)

| Route                            | Purpose                       |
| -------------------------------- | ----------------------------- |
| `POST /api/auth/send-otp`        | Send email OTP                |
| `POST /api/auth/login-otp`       | Login after OTP               |
| `POST /api/auth/agent-register`  | Register new wholesale client |
| `POST /api/clients/check-unique` | Email uniqueness check        |

### Admin (not user-facing)

| Route                         | Purpose                                     |
| ----------------------------- | ------------------------------------------- |
| `GET /api/admin/ai-analytics` | Session, rating, conversion metrics         |
| `/api/admin/ai-sales/*`       | Sales leads and recommendations             |
| `/api/admin/ai-studio/*`      | Separate CMS image AI (not storefront chat) |

---

## Feature comparison

| Feature                           | Web                   | Mobile                               |
| --------------------------------- | --------------------- | ------------------------------------ |
| Floating launcher                 | ✅ Bottom-right FAB   | ✅ FAB above tab bar                 |
| Text chat                         | ✅                    | ✅                                   |
| Quick-reply chips                 | ✅                    | ✅                                   |
| Guest Register/Login in chat      | ✅                    | ✅                                   |
| GST captcha verify                | ✅                    | ✅                                   |
| Email OTP                         | ✅                    | ✅                                   |
| Approved-only catalog/cart        | ✅                    | ✅                                   |
| Visual search in AI chat          | ✅                    | ✅ (with sheet hide workaround)      |
| Page context (product/cart aware) | ✅                    | ✅ (from navigation + hooks)         |
| Place order via AI                | ✅                    | ✅                                   |
| Confetti on order                 | ✅                    | ✅                                   |
| Session resume                    | ✅ (browser storage)  | ✅ (AsyncStorage)                    |
| Language EN / HI / Hinglish       | ✅                    | ✅                                   |
| Inactivity → rating prompt        | ✅ (5 min)            | ✅ (5 min)                           |
| Bold `**text**` in replies        | ✅                    | ✅                                   |
| Cart sync after order             | ✅ localStorage + API | ✅ Redux + API                       |
| Catalog search visual search      | N/A                   | ✅ Search tab (`/api/search/visual`) |

---

## End-to-end flows

### Approved user places order (both platforms)

```
Open Sarjan AI
  → Bootstrap session (preferences + welcome)
  → User: "Place order" or taps chip
  → POST /order-bot/chat
  → Engine validates cart → createOrder(placedVia: "ai_bot")
  → Response: orderPlaced, orderId, navActions
  → Confetti + toast + close AI + clear cart
```

### Guest registers (both platforms)

```
Open Sarjan AI
  → Language pick
  → Welcome + Register chip
  → Step-by-step fields in chat
  → [Optional] GST captcha verify
  → Email OTP
  → POST /auth/agent-register
  → "Pending admin approval" message
  → After approval + login → full AI unlocked
```

### Visual search (approved)

```
Tap camera
  → [Mobile: hide sheet, open picker, restore sheet]
  → Upload image
  → POST /order-bot/visual-search
  → Vision + catalog match
  → Product cards in chat
  → User adds to cart via action API
```

---

## Key files index

### Web (`sarjan-textiles`)

```
src/components/storefront/
  OrderBotWidget.tsx          # Main widget
  OrderBotVisuals.tsx         # Cards, OTP, GST, language
  OrderConfettiLayer.tsx      # Confetti DOM layer
  ModaveShell.tsx             # Global mount
  *AiContextBridge.tsx        # Page context

src/lib/
  order-bot-client.ts         # Fetch wrappers
  order-bot/engine.ts         # Chat engine
  order-bot/llm-agent.ts      # OpenAI tools
  order-bot/actions.ts        # Cart + place order
  ai-auth/flow.ts             # Guest auth conversation
  ai-chat/store.ts            # Persistent sessions
  ai-chat/welcome.ts          # Welcome + quick actions
  visual-search.ts            # Image search logic
  order-celebration.ts        # Confetti helpers

src/app/api/client/order-bot/
  chat/route.ts
  action/route.ts
  session/route.ts
  preferences/route.ts
  visual-search/route.ts
```

### Mobile (`sarjan-textiles-app`)

```
src/context/SarjanAiContext.tsx
src/components/ai/
  SarjanAiSheet.tsx
  SarjanAiFab.tsx
  SarjanAiGstPanel.tsx
src/components/sheets/AppBottomSheet.tsx
src/services/
  orderBotService.ts
  visualSearchService.ts
  aiOrderCelebration.ts
  sarjanAiStorage.ts
src/lib/ai-auth/flow.ts
src/utils/
  aiQuickActions.ts
  aiMessageText.tsx
  sheetLifecycle.ts
src/hooks/useSarjanAiPageContext.ts
src/constants/config.ts
```

---

## Local development

### Web

```bash
cd sarjan-textiles
npm run dev    # default port 3001
```

Widget appears on all storefront pages automatically via `ModaveShell`.

### Mobile

```bash
# Terminal 1 — backend
cd sarjan-textiles && npm run dev

# Terminal 2 — app
cd sarjan-textiles-app && npm start
```

`src/constants/config.ts` points debug builds to:

- **iOS simulator:** `http://localhost:3001`
- **Android emulator:** `http://10.0.2.2:3001`
- **Production:** `https://sarjantextiles.com`

Physical device: use your machine’s LAN IP instead of `localhost`.

### Environment

Backend needs OpenAI (and related keys) in `.env.local` for LLM and visual search. See `.env.example` in `sarjan-textiles`.

---

## Testing

### Web

```bash
cd sarjan-textiles
npm run test:sarjan-ai
```

Suite: `scripts/test-sarjan-ai-suite.ts`  
Report example: `test-results/SARJAN-AI-TEST-REPORT.md`

### Mobile

```bash
cd sarjan-textiles-app
npm test -- --testPathPattern="ai-|sheetLifecycle"
```

Relevant tests:

- `src/qa/__tests__/ai-quick-actions.test.ts`
- `src/qa/__tests__/ai-order-celebration.test.ts`
- `src/qa/__tests__/ai-visual-search-sheet.test.ts`
- `src/qa/__tests__/sheetLifecycle.test.ts`

E2E (Maestro): `.maestro/flows/08-sarjan-ai-scroll.yaml`

---

## Notes for maintainers

1. **Naming:** Code says “order-bot”; UI says “Sarjan AI” — same system.
2. **No `/api/ai` prefix:** Storefront AI is `/api/client/order-bot/*`.
3. **Quick actions:** Server sends chips; clients filter out Register/Login for approved users via `filterQuickActionsForApproved()`.
4. **Orders:** Always tagged `placedVia: "ai_bot"` for analytics and admin badges.
5. **Mobile vs web parity:** Feature set is intentionally aligned; mobile adds sheet/picker lifecycle workarounds native platforms require.

---

## Sarjan AI 3.1 (Enhancement Sprint)

### 1. AI Memory Engine

| Table                     | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `ai_user_interests`       | Per-client scores for search, views, cart, orders (web + app `sources`) |
| `ai_user_recommendations` | Cached recommendation blocks per kind                                   |

**Track:** `POST /api/client/ai-memory/track` — also mirrored from order-bot events via `trackBotEvent()` → `mirrorBotEventToMemory()`.

**Generate:** `GET /api/client/ai-memory/recommendations` — Continue Shopping, Recommended Products, Similar, Best Sellers, FBT, Premium Alternatives.

**Code:** `src/lib/ai-memory/{store,engine,types}.ts`

### 2. AI Revenue Dashboard

- Admin: `/admin/ai-revenue`
- API: `GET /api/admin/ai-revenue`
- Metrics: AI orders, revenue, conversion rate, top products/categories, lead stats

### 3. AI Lead Capture (abandoned intent)

- On session close with cart but no order → `captureAbandonedPurchaseIntent()` → `ai_leads` with `intent_type: abandoned_cart`
- Admin: `/admin/ai-leads` — `GET /api/admin/ai-leads`

### 4. Recommendation Engine (extended)

New kinds in `ai-sales/recommendations.ts`: `best_sellers`, `premium_alternatives`.

### 5. Cross-device AI memory

- **Mobile:** `AsyncStorage` session ID + `aiMemoryService.ts` sync on bot responses
- **Web:** `localStorage` session ID via `web-session.ts` + resume on open
- Interests keyed by `client_id` — same profile on web and app

### 6. Meta Pixel + CAPI

- `MetaPixel.tsx` (consent-gated, like GA4)
- `POST /api/meta/conversions` — server-side events
- AI order CAPI from `placeBotOrder()` in `order-bot/actions.ts`
- Env: `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `META_CAPI_TEST_EVENT_CODE`

### 7. Testing

```bash
npm run test:sarjan-ai-31
```

Report: `test-results/SARJAN-AI-3.1-TEST-REPORT.md`

---

_Last updated: June 2026 — includes Sarjan AI 3.1 memory, revenue, leads, Meta Pixel._
