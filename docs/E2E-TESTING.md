# End-to-end testing (Playwright)

Automated **frontend + backend** tests for Sarjan Textiles (Next.js UI + `/api/*` routes). Every test run records a **video** (`.webm`) you can share or review.

## Stack

| Tool                                 | Role                                                     |
| ------------------------------------ | -------------------------------------------------------- |
| [Playwright](https://playwright.dev) | Browser automation, API requests, video + HTML report    |
| `npm run dev`                        | E2E app on port **3099** (auto-started; launch gate off) |

## One-time setup

```bash
cd /Users/kbrahmaxatr/Desktop/Karan/sarjan-textiles
npm install
npx playwright install chromium
```

Ensure `.env.local` has at least:

```env
DATABASE_URL=postgresql://...
ADMIN_EMAIL=admin@sarjantextiles.com
ADMIN_PASSWORD=admin123
ADMIN_SESSION_SECRET=...
CLIENT_JWT_SECRET=...
SITE_LAUNCH_AT=
```

`SITE_LAUNCH_AT` must be **empty** during tests (config forces this for the dev server).

Optional overrides for CI:

```env
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3099
PLAYWRIGHT_PORT=3099
PLAYWRIGHT_ADMIN_EMAIL=...
PLAYWRIGHT_ADMIN_PASSWORD=...
```

## Run all E2E tests (with video)

```bash
npm run test:e2e
```

App already running on 3001:

```bash
npm run test:e2e:local
```

Open HTML report + videos:

```bash
npm run test:e2e:report
```

## What gets tested

| File                                | Covers                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `e2e/01-api-backend.spec.ts`        | `/api/health`, `/api/homepage`, categories, inventory, auth session, admin login API |
| `e2e/02-storefront-ui.spec.ts`      | Homepage, shop, login, contact                                                       |
| `e2e/03-admin-ui.spec.ts`           | Admin login UI, CMS page                                                             |
| `e2e/04-full-journey.spec.ts`       | Full flow: public site → API → admin → CMS → home                                    |
| `e2e/05-audit.spec.ts`              | API audit, CSS/fonts/images, flows                                                   |
| `e2e/06-b2b-full-lifecycle.spec.ts` | B2B A→Z: register → approve → order → dispatch (long video)                          |
| `e2e/07-senior-qa-ui.spec.ts`       | **Senior QA**: responsive UI, forms, buttons, tables, layout @ 375/768/1440px        |

## Senior QA + audit report

```bash
npm run test:e2e:audit    # all desktop tests + markdown/HTML report
npm run test:e2e:qa       # audit + senior UI only (faster)
npm run test:e2e:b2b      # full B2B lifecycle video
npm run test:e2e:full     # audit + B2B
```

Report output: `test-results/E2E-AUDIT-REPORT.md` and `.html` (429+ checks: pages, CSS, forms, buttons, tables, overflow, typography).

Runs on **desktop Chrome** by default; mobile project skips senior QA (viewports are simulated in `07-senior-qa-ui`).

## Video & artifacts

After a run:

```
test-results/
  04-full-journey-full-journey-...-chromium-desktop/
    video.webm          ← screen recording
  ...
playwright-report/
  index.html            ← open in browser, click test → watch video
```

Finder:

```bash
open playwright-report
open test-results
```

## Test against production (read-only smoke)

**Do not** run admin write tests on live without a staging env.

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://sarjantextiles.com \
  npx playwright test e2e/01-api-backend.spec.ts e2e/02-storefront-ui.spec.ts
```

Skip admin tests on prod unless you use a staging URL.

## CI (GitHub Actions)

Add workflow step:

```yaml
- run: npx playwright install --with-deps chromium
- run: npm run test:e2e
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
```

Upload artifacts:

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-videos
    path: |
      test-results/**/video.webm
      playwright-report/
```

## Mobile app (React Native)

The **sarjan-textiles-app** is separate. Options:

- **Maestro** — YAML flows, screen recordings on device/simulator
- **Detox** — gray-box E2E for RN
- **Appium** — cross-platform

Web E2E here does **not** replace mobile testing; it covers the shared Next.js API + storefront.

## Add more tests

```bash
npx playwright codegen http://127.0.0.1:3001
```

Records clicks and generates Playwright code. Save under `e2e/` and re-run with video on.
