import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.PLAYWRIGHT_PORT ?? "3099";
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${e2ePort}`;

/**
 * Full-stack E2E (Next.js UI + /api/* backend).
 * Videos: test-results/<test>/video.webm
 * HTML report: playwright-report/index.html
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    video: "on",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  outputDir: "test-results",
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /06-b2b-full-lifecycle/,
      timeout: 120_000,
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      testIgnore: /06-b2b-full-lifecycle|07-senior-qa-ui/,
    },
    {
      name: "b2b-lifecycle",
      testMatch: /06-b2b-full-lifecycle/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: { slowMo: 700 },
        video: { mode: "on", size: { width: 1440, height: 900 } },
      },
      timeout: 600_000,
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run dev -- -p ${e2ePort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          SITE_LAUNCH_AT: "",
          SMTP_DEV_CONSOLE_OTP: "true",
          E2E_EXPOSE_OTP: "true",
        },
      },
});
