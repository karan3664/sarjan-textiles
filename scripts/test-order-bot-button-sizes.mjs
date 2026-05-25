/**
 * Sarjan AI: nav links + quick chips — same height + font-size.
 * Run: npx playwright install chromium && node scripts/test-order-bot-button-sizes.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator(".sarjan-order-bot-launcher").click();
  await page.waitForSelector(".sarjan-order-bot-panel", { timeout: 10000 });

  const data = await page.evaluate(() => {
    const measure = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        h: Math.round(r.height),
        fs: Math.round(parseFloat(s.fontSize)),
        label: el.textContent?.trim().slice(0, 24),
      };
    };
    const nav = [
      ...document.querySelectorAll(".sarjan-order-bot-nav-link"),
    ].map(measure);
    const chips = [...document.querySelectorAll(".sarjan-order-bot-chip")].map(
      measure,
    );
    return { nav, chips };
  });

  await browser.close();

  const all = [...data.nav, ...data.chips];
  if (!all.length) {
    console.error("No nav/chip buttons found");
    process.exit(1);
  }

  const heights = all.map((x) => x.h);
  const sizes = all.map((x) => x.fs);
  const hSpread = Math.max(...heights) - Math.min(...heights);
  const sSpread = Math.max(...sizes) - Math.min(...sizes);

  for (const row of data.nav) {
    console.log(`nav: height=${row.h}px fs=${row.fs}px "${row.label}"`);
  }
  for (const row of data.chips) {
    console.log(`chip: height=${row.h}px fs=${row.fs}px "${row.label}"`);
  }

  const issues = [];
  if (hSpread > 1) issues.push(`height spread ${hSpread}px`);
  if (sSpread > 0) issues.push(`font-size spread ${sSpread}px`);

  const pass = issues.length === 0;
  console.log(pass ? "\nPASS" : `\nFAIL: ${issues.join("; ")}`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
