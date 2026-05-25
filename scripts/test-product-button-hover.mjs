/**
 * Product PDP buttons: white default, red hover (+ .is-hovered).
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const BRAND_RED = "rgb(139, 30, 45)";
const WHITE = "rgb(255, 255, 255)";
const NEAR_BLACK = "rgb(24, 24, 24)";

function norm(c) {
  return c.replace(/\s+/g, " ");
}

function match(actual, expected) {
  return norm(actual) === norm(expected);
}

async function probeButton(page, selector, label) {
  const btn = page.locator(selector).first();
  if ((await btn.count()) === 0) return { label, found: false };

  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);

  const before = await btn.evaluate((el) => {
    const s = getComputedStyle(el);
    const icon = el.querySelector(".sarjan-tf-btn-icon");
    const labelEl = el.querySelector(
      ".sarjan-add-set-label, .sarjan-all-colors-label",
    );
    return {
      classes: el.className,
      bg: s.backgroundColor,
      color: s.color,
      border: s.borderTopColor,
      isHovered: el.classList.contains("is-hovered"),
      iconColor: icon ? getComputedStyle(icon).color : null,
      labelColor: labelEl ? getComputedStyle(labelEl).color : null,
      afterDisplay: getComputedStyle(el, "::after").display,
      afterBg: getComputedStyle(el, "::after").backgroundColor,
    };
  });

  await btn.hover({ force: true });
  await page.waitForTimeout(250);

  const after = await btn.evaluate((el) => {
    const s = getComputedStyle(el);
    const icon = el.querySelector(".sarjan-tf-btn-icon");
    const labelEl = el.querySelector(
      ".sarjan-add-set-label, .sarjan-all-colors-label",
    );
    return {
      bg: s.backgroundColor,
      color: s.color,
      border: s.borderTopColor,
      isHovered: el.classList.contains("is-hovered"),
      iconColor: icon ? getComputedStyle(icon).color : null,
      labelColor: labelEl ? getComputedStyle(labelEl).color : null,
      afterDisplay: getComputedStyle(el, "::after").display,
      afterTransform: getComputedStyle(el, "::after").transform,
    };
  });

  const passDefault =
    match(before.bg, WHITE) && match(before.color, NEAR_BLACK);
  const passHover =
    match(after.bg, BRAND_RED) && match(after.color, WHITE) && after.isHovered;

  return {
    label,
    found: true,
    passDefault,
    passHover,
    before,
    after,
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
await page
  .waitForSelector(".sarjan-add-set-btn", { timeout: 20000 })
  .catch(() => {});

const sheets = await page.evaluate(() =>
  [...document.styleSheets]
    .map((ss) => {
      try {
        return ss.href || "inline";
      } catch {
        return "blocked";
      }
    })
    .filter(Boolean),
);

const results = [];
for (const [sel, name] of [
  [".sarjan-add-set-btn", "Add set"],
  [".sarjan-all-colors-btn", "All colors"],
  ["#wrapper .sarjan-btn", "Any sarjan-btn"],
]) {
  results.push(await probeButton(page, sel, name));
}

await browser.close();

const tested = results.filter((r) => r.found);
const failed = tested.filter((r) => !r.passDefault || !r.passHover);

console.log(
  JSON.stringify(
    {
      base: BASE,
      stylesheets: sheets.filter((h) =>
        /storefront-buttons|sarjan-button|styles\.css|globals/.test(h),
      ),
      tested: tested.length,
      passed: tested.filter((r) => r.passDefault && r.passHover).length,
      failed: failed.length,
      results: tested,
    },
    null,
    2,
  ),
);

process.exit(failed.length || tested.length === 0 ? 1 : 0);
