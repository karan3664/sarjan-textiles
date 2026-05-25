/**
 * Verify storefront CTA buttons: white + black default, red + white on hover.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const BRAND_RED = "rgb(139, 30, 45)";
const WHITE = "rgb(255, 255, 255)";
const NEAR_BLACK = "rgb(24, 24, 24)";

function rgb(c) {
  return c.replace(/\s+/g, " ");
}

function closeEnough(actual, expected) {
  return rgb(actual) === rgb(expected);
}

async function sampleButton(page, selector, label) {
  const btn = page.locator(selector).first();
  const count = await btn.count();
  if (count === 0) return { label, found: false };

  await btn.scrollIntoViewIfNeeded();
  const normal = await btn.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      bg: s.backgroundColor,
      color: s.color,
      border: s.borderColor,
      classes: el.className,
    };
  });

  await btn.hover({ force: true });
  await page.waitForTimeout(200);
  const hover = await btn.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      bg: s.backgroundColor,
      color: s.color,
      border: s.borderColor,
    };
  });

  return {
    label,
    found: true,
    classes: normal.classes,
    normal,
    hover,
    passDefault:
      closeEnough(normal.bg, WHITE) && closeEnough(normal.color, NEAR_BLACK),
    passHover:
      closeEnough(hover.bg, BRAND_RED) && closeEnough(hover.color, WHITE),
  };
}

const pages = [
  {
    path: "/",
    selectors: ["#wrapper .tf-btn.btn-fill", ".sarjan-btn", "a.tf-btn"],
  },
  { path: "/shop", selectors: ["#wrapper .tf-btn", ".sarjan-btn"] },
  {
    path: "/cart",
    selectors: ["#wrapper .tf-btn", ".sarjan-btn", "button.tf-btn"],
  },
  {
    path: "/login",
    selectors: ["#wrapper .tf-btn", ".sarjan-btn", "button.tf-btn"],
  },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const results = [];
let cssLoaded = false;

for (const { path, selectors } of pages) {
  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page
    .waitForSelector("body.preload-wrapper", { timeout: 15000 })
    .catch(() => {});

  if (!cssLoaded) {
    cssLoaded = await page.evaluate(() => {
      return [...document.styleSheets].some((ss) => {
        try {
          return ss.href && ss.href.includes("storefront-buttons");
        } catch {
          return false;
        }
      });
    });
  }

  for (const sel of selectors) {
    const r = await sampleButton(page, sel, `${path} → ${sel}`);
    if (r.found) results.push(r);
  }
}

await browser.close();

const tested = results.filter((r) => r.found);
const passed = tested.filter((r) => r.passDefault && r.passHover);
const failed = tested.filter((r) => !r.passDefault || !r.passHover);

console.log(
  JSON.stringify(
    {
      base: BASE,
      cssLoaded,
      tested: tested.length,
      passed: passed.length,
      failed: failed.length,
      results: tested,
    },
    null,
    2,
  ),
);

if (!cssLoaded || failed.length > 0 || tested.length === 0) {
  process.exit(1);
}
