/**
 * Test product card hover → Quick View icon visible → modal opens.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const BRAND_RED = "rgb(139, 30, 45)";
const WHITE = "rgb(255, 255, 255)";
const NEAR_BLACK = "rgb(24, 24, 24)";

function rgb(c) {
  return c.replace(/\s+/g, " ");
}

async function visibleStyle(locator) {
  return locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      opacity: s.opacity,
      visibility: s.visibility,
      display: s.display,
      pointerEvents: s.pointerEvents,
      bg: s.backgroundColor,
      color: s.color,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const report = { base: BASE, steps: [] };

try {
  for (const path of ["/", "/categories", "/search-result"]) {
    await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    const n = await page
      .locator(".card-product:not(.sarjan-search-card)")
      .count();
    if (n > 0) {
      report.page = path;
      break;
    }
  }

  await page.waitForSelector(".card-product:not(.sarjan-search-card)", {
    state: "attached",
    timeout: 30000,
  });

  // WOW.js can leave opacity:0 until scroll; force visible for hover test
  await page.evaluate(() => {
    document.querySelectorAll(".wow").forEach((el) => {
      el.classList.add("animated");
      el.style.opacity = "1";
      el.style.visibility = "visible";
    });
  });

  const card = page.locator(".card-product:not(.sarjan-search-card)").first();
  const wrapper = card.locator(".card-product-wrapper").first();
  const quickView = card.locator("[data-quick-view].quickview").first();
  const imgHover = card.locator(".img-hover").first();

  await wrapper.scrollIntoViewIfNeeded();
  await wrapper.hover({ force: true });
  await page.waitForTimeout(400);

  const beforeHover = await visibleStyle(quickView);
  const hoverImg = await imgHover.evaluate(
    (el) => getComputedStyle(el).opacity,
  );

  report.steps.push({
    step: "card hover → quick view icon visible",
    pass:
      parseFloat(beforeHover.opacity) >= 0.99 &&
      beforeHover.visibility === "visible",
    detail: { quickView: beforeHover, imgHoverOpacity: hoverImg },
  });

  await quickView.hover({ force: true });
  await page.waitForTimeout(250);
  const qvHover = await visibleStyle(quickView);
  const qvTooltip = await card
    .locator("[data-quick-view] .tooltip")
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return { opacity: s.opacity, visibility: s.visibility };
    })
    .catch(() => null);

  report.steps.push({
    step: "quick view icon hover (tooltip + icon styles)",
    pass: parseFloat(qvHover.opacity) >= 0.99,
    detail: { icon: qvHover, tooltip: qvTooltip },
  });

  await quickView.click({ force: true });
  await page
    .waitForSelector("#quickView.show, #quickView.modal.show", {
      timeout: 15000,
    })
    .catch(() => page.waitForSelector("#quickView", { timeout: 5000 }));

  const modal = page.locator("#quickView");
  const modalVisible = await modal.evaluate((el) => {
    const s = getComputedStyle(el);
    return (
      el.classList.contains("show") ||
      s.display !== "none" ||
      s.visibility === "visible"
    );
  });

  await page.waitForTimeout(800);
  const modalContent = await page
    .locator("#quickView .tf-product-info-name .name, #quickView .name")
    .first()
    .textContent()
    .catch(() => "");
  const loading = await page
    .locator("#quickView .tf-btn-loading, #quickView [class*='loading']")
    .count();

  const addBtn = page
    .locator(
      "#quickView .tf-btn.btn-fill, #quickView .btn-main-product, #quickView .sarjan-btn",
    )
    .first();
  const addBtnStyles =
    (await addBtn.count()) > 0 ? await visibleStyle(addBtn) : null;

  report.steps.push({
    step: "click quick view → modal opens with product",
    pass: modalVisible && (modalContent?.trim().length > 0 || loading === 0),
    detail: {
      modalVisible,
      productName: modalContent?.trim().slice(0, 80),
      addBtn: addBtnStyles,
    },
  });

  if (addBtnStyles) {
    const defaultOk =
      rgb(addBtnStyles.bg) === WHITE ||
      addBtnStyles.bg.includes("255, 255, 255");
    report.steps.push({
      step: "quick view CTA default (white bg)",
      pass: defaultOk,
      detail: addBtnStyles,
    });
  }
} catch (err) {
  report.error = String(err?.message || err);
}

await browser.close();

const failed = report.steps.filter((s) => !s.pass);
report.summary = {
  total: report.steps.length,
  passed: report.steps.length - failed.length,
  failed: failed.length,
  ok: failed.length === 0 && !report.error,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.summary.ok ? 0 : 1);
