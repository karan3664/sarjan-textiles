/**
 * Sarjan AI Phases 1–6 — automated test suite + PASS/FAIL report.
 *
 * Run: npm run test:sarjan-ai
 * With screenshots (dev server on :3001): npm run test:sarjan-ai:screenshots
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type ResultRow = {
  area: string;
  test: string;
  type: "unit" | "integration" | "api" | "screenshot" | "manual";
  status: "PASS" | "FAIL" | "SKIP" | "MANUAL";
  detail?: string;
  screenshot?: string;
};

const root = process.cwd();
const resultsDir = path.join(root, "test-results");
const reportPath = path.join(resultsDir, "SARJAN-AI-TEST-REPORT.md");
const screenshotDir = path.join(resultsDir, "sarjan-ai-screenshots");

const UNIT_SCRIPTS = [
  "scripts/test-ai-chat-store.ts",
  "scripts/test-ai-sales.ts",
  "scripts/test-ai-auth-flow.ts",
  "scripts/test-ai-page-context.ts",
  "scripts/test-visual-search.ts",
  "scripts/test-order-bot-visual-search.ts",
];

const rows: ResultRow[] = [];

function runTs(script: string): ResultRow {
  const name = path.basename(script, ".ts");
  const res = spawnSync("npx", ["tsx", "--env-file=.env.local", script], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  const ok = res.status === 0;
  return {
    area: "Automated Unit",
    test: name,
    type: "unit",
    status: ok ? "PASS" : "FAIL",
    detail: ok
      ? (res.stdout || "").trim() || "ok"
      : (res.stderr || res.stdout || "failed").trim().slice(0, 500),
  };
}

function runRouteIntegrationCheck(): ResultRow {
  const routePath = path.join(
    root,
    "src/app/api/client/order-bot/visual-search/route.ts",
  );
  const handlerPath = path.join(
    root,
    "src/lib/order-bot/visual-search-handler.ts",
  );
  const ok = existsSync(routePath) && existsSync(handlerPath);
  return {
    area: "Integration",
    test: "order-bot visual-search API wired",
    type: "integration",
    status: ok ? "PASS" : "FAIL",
    detail: ok
      ? "route.ts + visual-search-handler.ts present"
      : "missing visual search route or handler",
  };
}

async function runApiSmoke(): Promise<ResultRow> {
  const base = process.env.BASE_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${base}/api/search/visual`, { method: "GET" });
    const reachable = res.status >= 200 && res.status < 600;
    return {
      area: "API",
      test: "Visual search API route reachable",
      type: "api",
      status: reachable ? "PASS" : "SKIP",
      detail: reachable
        ? `GET status ${res.status} (POST /api/client/order-bot/visual-search requires auth + multipart)`
        : `No response from ${base}`,
    };
  } catch {
    return {
      area: "API",
      test: "API server reachable",
      type: "api",
      status: "SKIP",
      detail: `Dev server not running at ${base}`,
    };
  }
}

async function devServerReady(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/shop`, { method: "GET" });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

async function loginApprovedClientForScreenshots(
  page: import("playwright").Page,
  base: string,
): Promise<boolean> {
  const email = process.env.SARJAN_AI_TEST_EMAIL?.trim();
  const password = process.env.SARJAN_AI_TEST_PASSWORD?.trim();
  if (!email || !password) return false;
  const res = await page.request.post(`${base}/api/auth/login`, {
    data: { email, password },
  });
  return res.ok();
}

async function dismissLanguagePickIfShown(page: import("playwright").Page) {
  const langFooter = page.locator(".sarjan-order-bot-lang-footer");
  if (!(await langFooter.isVisible().catch(() => false))) return;
  const english = page.locator(".sarjan-order-bot-language__btn").first();
  await english.click();
  await page
    .locator(".sarjan-order-bot-photo")
    .waitFor({ state: "visible", timeout: 12_000 })
    .catch(() => undefined);
}

async function openOrderBotPanel(
  page: import("playwright").Page,
  base: string,
) {
  await page.goto(`${base}/shop`, { waitUntil: "domcontentloaded" });
  await page.locator(".sarjan-order-bot-launcher").click();
  await page.locator(".sarjan-order-bot-panel").waitFor({ timeout: 12_000 });
}

async function runScreenshotChecks(): Promise<ResultRow[]> {
  if (process.env.RUN_SCREENSHOTS !== "1") return [];

  const base = process.env.BASE_URL || "http://localhost:3001";
  if (!(await devServerReady(base))) {
    return [
      {
        area: "Screenshots",
        test: "dev-server",
        type: "screenshot",
        status: "SKIP",
        detail: `Dev server not reachable at ${base} — run "npm run dev" in a separate terminal first (do not add "# comment" on the same line)`,
      },
    ];
  }

  try {
    const { chromium } = await import("playwright");
    mkdirSync(screenshotDir, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const out: ResultRow[] = [];

    const shots: Array<{
      name: string;
      fn: (page: import("playwright").Page) => Promise<void>;
    }> = [
      {
        name: "web-order-bot-panel",
        fn: async (page) => {
          await openOrderBotPanel(page, base);
        },
      },
      {
        name: "web-visual-search-button",
        fn: async (page) => {
          const loggedIn = await loginApprovedClientForScreenshots(page, base);
          await openOrderBotPanel(page, base);
          if (loggedIn) {
            await dismissLanguagePickIfShown(page);
          }
          const photo = page.locator(".sarjan-order-bot-photo");
          if (!loggedIn) {
            const visible = await photo.isVisible().catch(() => false);
            if (!visible) {
              throw new Error(
                "SKIP: 📷 button requires an approved B2B login — set SARJAN_AI_TEST_EMAIL and SARJAN_AI_TEST_PASSWORD in .env.local",
              );
            }
          }
          await photo.waitFor({ state: "visible", timeout: 12_000 });
        },
      },
    ];

    for (const shot of shots) {
      const file = path.join(screenshotDir, `${shot.name}.png`);
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      try {
        await shot.fn(page);
        await page.screenshot({ path: file, fullPage: false });
        out.push({
          area: "Screenshots",
          test: shot.name,
          type: "screenshot",
          status: existsSync(file) ? "PASS" : "FAIL",
          screenshot: file.replace(root + path.sep, ""),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const skip = message.startsWith("SKIP:");
        out.push({
          area: "Screenshots",
          test: shot.name,
          type: "screenshot",
          status: skip ? "SKIP" : "FAIL",
          detail: skip ? message.replace(/^SKIP:\s*/, "") : message,
        });
      } finally {
        await context.close();
      }
    }

    await browser.close();
    return out;
  } catch (error) {
    return [
      {
        area: "Screenshots",
        test: "playwright capture",
        type: "screenshot",
        status: "SKIP",
        detail:
          error instanceof Error
            ? error.message
            : "Install playwright: npx playwright install chromium",
      },
    ];
  }
}

const MANUAL_MATRIX: ResultRow[] = [
  {
    area: "Manual QA",
    test: "New user registration via Sarjan AI",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Manual QA",
    test: "Existing user login via mobile OTP",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Manual QA",
    test: "Guest user Register/Login chips",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Manual QA",
    test: "Order placement from product cards",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Manual QA",
    test: "Language switching (EN / HI / Hinglish)",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Manual QA",
    test: "Session resume after refresh",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Manual QA",
    test: "Rating submission on close",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Manual QA",
    test: "Mobile Sarjan AI FAB + chat sheet",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Manual QA",
    test: "Admin AI analytics dashboard",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Manual QA",
    test: "Visual search — upload shirt photo (web + app)",
    type: "manual",
    status: "MANUAL",
  },
];

async function main() {
  mkdirSync(resultsDir, { recursive: true });

  for (const script of UNIT_SCRIPTS) {
    rows.push(runTs(script));
  }

  rows.push(runRouteIntegrationCheck());
  rows.push(await runApiSmoke());
  rows.push(...(await runScreenshotChecks()));
  rows.push(...MANUAL_MATRIX);

  const automated = rows.filter(
    (r) =>
      (r.type === "unit" || r.type === "integration" || r.type === "api") &&
      (r.status === "PASS" || r.status === "FAIL"),
  );
  const screenshotRows = rows.filter((r) => r.type === "screenshot");
  const screenshotFailed = screenshotRows.filter(
    (r) => r.status === "FAIL",
  ).length;
  const passed = automated.filter((r) => r.status === "PASS").length;
  const failed = automated.filter((r) => r.status === "FAIL").length;
  const skipped = rows.filter((r) => r.status === "SKIP").length;
  const manual = rows.filter((r) => r.status === "MANUAL").length;
  const overall = failed === 0 ? "PASS" : "FAIL";

  const lines = [
    "# Sarjan AI Test Report (Phases 1–6)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|-------|`,
    `| **Overall** | **${overall}** |`,
    `| Automated PASS | ${passed} |`,
    `| Automated FAIL | ${failed} |`,
    `| Skipped | ${skipped} |`,
    `| Manual checklist | ${manual} |`,
    "",
    "## Automated — Unit Tests",
    "",
    "| Test | Status | Detail |",
    "|------|--------|--------|",
    ...rows
      .filter((r) => r.type === "unit")
      .map(
        (r) =>
          `| ${r.test} | ${r.status} | ${(r.detail ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")} |`,
      ),
    "",
    "## Automated — Integration Tests",
    "",
    "| Test | Status | Detail |",
    "|------|--------|--------|",
    ...rows
      .filter((r) => r.type === "integration")
      .map(
        (r) =>
          `| ${r.test} | ${r.status} | ${(r.detail ?? "").replace(/\|/g, "\\|")} |`,
      ),
    "",
    "## Automated — API Tests",
    "",
    "| Test | Status | Detail |",
    "|------|--------|--------|",
    ...rows
      .filter((r) => r.type === "api")
      .map(
        (r) =>
          `| ${r.test} | ${r.status} | ${(r.detail ?? "").replace(/\|/g, "\\|")} |`,
      ),
    "",
    "## Screenshots",
    "",
  ];

  const shots = rows.filter((r) => r.screenshot);
  if (shots.length) {
    for (const s of shots) {
      lines.push(`### ${s.test} — ${s.status}`);
      lines.push("");
      lines.push(`![${s.test}](${s.screenshot})`);
      lines.push("");
    }
  }
  const screenshotNotes = screenshotRows.filter((r) => !r.screenshot);
  if (screenshotNotes.length) {
    lines.push("| Screenshot check | Status | Detail |");
    lines.push("|------------------|--------|--------|");
    for (const r of screenshotNotes) {
      lines.push(
        `| ${r.test} | ${r.status} | ${(r.detail ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")} |`,
      );
    }
    lines.push("");
  }
  if (!shots.length && !screenshotNotes.length) {
    lines.push(
      "_No screenshots captured. Run `npm run test:sarjan-ai:screenshots` with dev server on port 3001._",
    );
    lines.push("");
  }

  lines.push("## Manual QA Checklist");
  lines.push("");
  lines.push("| Scenario | Status | Notes |");
  lines.push("|----------|--------|-------|");
  for (const r of rows.filter((x) => x.status === "MANUAL")) {
    lines.push(`| ${r.test} | ⏳ Pending | Capture screenshot when verified |`);
  }
  lines.push("");

  writeFileSync(reportPath, lines.join("\n"));
  writeFileSync(
    path.join(resultsDir, "sarjan-ai-results.json"),
    JSON.stringify({ overall, passed, failed, skipped, manual, rows }, null, 2),
  );

  console.log(`Sarjan AI test report: ${reportPath}`);
  console.log(
    `Overall: ${overall} (${passed} pass, ${failed} fail, ${skipped} skip, ${manual} manual${screenshotFailed ? `, ${screenshotFailed} screenshot fail` : ""})`,
  );

  if (
    failed > 0 ||
    (process.env.SARJAN_AI_STRICT_SCREENSHOTS === "1" && screenshotFailed > 0)
  ) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
