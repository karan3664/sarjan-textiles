/**
 * Sarjan AI — mobile / tablet layout smoke test.
 * Run: npx playwright install chromium && node scripts/test-sarjan-ai-responsive.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "iphone14-pro-max", width: 430, height: 932 },
  { name: "large-phone", width: 768, height: 1024 },
  { name: "tablet", width: 834, height: 1194 },
];

async function assertPanel(page, viewportName) {
  const launcher = page.locator(".sarjan-order-bot-launcher");
  await launcher.waitFor({ state: "visible", timeout: 15000 });
  await launcher.click();

  const panel = page.locator(".sarjan-order-bot-panel");
  await panel.waitFor({ state: "visible", timeout: 5000 });

  const box = await panel.boundingBox();
  const vw = page.viewportSize().width;
  const vh = page.viewportSize().height;

  if (!box) throw new Error(`${viewportName}: panel has no bounding box`);

  const issues = [];
  if (box.x < -2) issues.push(`panel off left (${box.x})`);
  if (box.x + box.width > vw + 2)
    issues.push(`panel overflows right (${box.x + box.width} > ${vw})`);
  if (box.y + box.height > vh + 2)
    issues.push(`panel overflows bottom (${box.y + box.height} > ${vh})`);
  if (viewportName === "mobile" && box.width < vw * 0.95)
    issues.push(`mobile panel not full width (${box.width} vs ${vw})`);

  const send = page.locator(".sarjan-order-bot-send");
  const input = page.locator(".sarjan-order-bot-form input");
  await send.waitFor({ state: "visible" });
  const sendBox = await send.boundingBox();
  const inputBox = await input.boundingBox();
  if (sendBox && inputBox && sendBox.y < inputBox.y + inputBox.height - 2) {
    /* stacked on mobile: send below input */
    if (viewportName === "mobile" && sendBox.y <= inputBox.y)
      issues.push("mobile send should be below input");
  }

  const close = page.locator(".sarjan-order-bot-close");
  await close.click();
  await panel.waitFor({ state: "hidden", timeout: 5000 });

  return { viewportName, width: box.width, height: box.height, issues };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/shop`, { waitUntil: "domcontentloaded" });
    try {
      results.push(await assertPanel(page, vp.name));
    } catch (err) {
      results.push({
        viewportName: vp.name,
        issues: [err.message || String(err)],
      });
    }
    await context.close();
  }

  await browser.close();

  let failed = false;
  for (const r of results) {
    if (r.issues?.length) {
      failed = true;
      console.error(`FAIL ${r.viewportName}:`, r.issues.join("; "));
    } else {
      console.log(`OK ${r.viewportName}: panel ${r.width}x${r.height}px`);
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
