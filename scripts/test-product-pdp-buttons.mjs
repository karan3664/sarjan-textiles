/**
 * PDP: Add set / All colors / Buy it now — same height + label font-size.
 * Run: npx playwright install chromium && node scripts/test-product-pdp-buttons.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const EXPECT_LABEL = 12;
const EXPECT_HEIGHT = 60;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.goto(`${BASE}/products`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  const href = await page
    .locator('a[href^="/products/"]')
    .first()
    .getAttribute("href");
  if (!href) throw new Error("No product link");
  await page.goto(`${BASE}${href}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  const data = await page.evaluate(() => {
    const pick = (root, sel) => {
      const el = root.querySelector(sel);
      if (!el) return null;
      const btn = el.closest("a.sarjan-btn, a.sarjan-buy-now-btn");
      const label =
        el.querySelector(".sarjan-add-set-label") ||
        el.querySelector(".sarjan-all-colors-label--long") ||
        el.querySelector(".sarjan-all-colors-label--short") ||
        el.querySelector(".text-button");
      const labelEl = label || el;
      const btnRect = btn?.getBoundingClientRect();
      const labelStyle = getComputedStyle(labelEl);
      return {
        btnH: btnRect ? Math.round(btnRect.height) : null,
        labelPx: Math.round(parseFloat(labelStyle.fontSize)),
        labelText: labelEl.textContent?.trim().slice(0, 24),
      };
    };
    return {
      addSet: pick(document, ".sarjan-add-set-btn"),
      allColors: pick(document, ".sarjan-all-colors-btn"),
      buyNow: pick(document, ".sarjan-buy-now-btn"),
    };
  });

  await browser.close();

  const rows = [
    ["Add 1 set", data.addSet],
    ["All colors", data.allColors],
    ["Buy it now", data.buyNow],
  ];
  const issues = [];
  const heights = [];
  const sizes = [];

  for (const [name, row] of rows) {
    if (!row) {
      issues.push(`${name}: not found`);
      continue;
    }
    heights.push(row.btnH);
    sizes.push(row.labelPx);
    if (Math.abs(row.btnH - EXPECT_HEIGHT) > 2) {
      issues.push(`${name}: height ${row.btnH}px (want ${EXPECT_HEIGHT})`);
    }
    if (Math.abs(row.labelPx - EXPECT_LABEL) > 1) {
      issues.push(`${name}: label ${row.labelPx}px (want ${EXPECT_LABEL})`);
    }
    console.log(
      `${name}: height=${row.btnH}px label=${row.labelPx}px "${row.labelText}"`,
    );
  }

  const hSpread = Math.max(...heights) - Math.min(...heights);
  const sSpread = Math.max(...sizes) - Math.min(...sizes);
  if (hSpread > 1) issues.push(`height mismatch spread ${hSpread}px`);
  if (sSpread > 1) issues.push(`label size mismatch spread ${sSpread}px`);

  const pass = issues.length === 0;
  console.log(pass ? "\nPASS" : `\nFAIL: ${issues.join("; ")}`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
