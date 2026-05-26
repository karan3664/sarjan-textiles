/**
 * Mobile PDP + Quick View: button layout (no overflow, icon/text align, single column).
 * Run: node scripts/test-product-pdp-buttons-mobile.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const WIDTHS = [360, 390, 600];

async function checkButtons(page, context) {
  return page.evaluate((ctx) => {
    const root =
      ctx === "quickView"
        ? document.querySelector(".modal-quick-view")
        : document.querySelector(".tf-product-info-list");
    if (!root) return { error: `${ctx}: root not found` };

    const buttons = root.querySelector(".sarjan-product-action-buttons");
    const add = root.querySelector(".sarjan-add-set-btn");
    const all = root.querySelector(".sarjan-all-colors-btn");
    const container =
      ctx === "quickView"
        ? document.querySelector(".modal-quick-view .modal-content")
        : root;

    if (!buttons || !add || !all || !container) {
      return { error: `${ctx}: missing elements` };
    }

    const icon =
      all.querySelector(".sarjan-pdp-cta-btn__icon .sarjan-tf-btn-icon") ||
      all.querySelector(".sarjan-tf-btn-icon");
    const short =
      all.querySelector(".sarjan-all-colors-label--short") ||
      all.querySelector(".sarjan-all-colors-label--long");
    const spacer = all.querySelector(".sarjan-all-colors-price-spacer");

    const cr = container.getBoundingClientRect();
    const ar = add.getBoundingClientRect();
    const alr = all.getBoundingClientRect();
    const br = buttons.getBoundingClientRect();

    const iconCy = icon
      ? icon.getBoundingClientRect().top +
        icon.getBoundingClientRect().height / 2
      : 0;
    const textCy = short
      ? short.getBoundingClientRect().top +
        short.getBoundingClientRect().height / 2
      : 0;

    const gridCols = getComputedStyle(buttons).gridTemplateColumns;
    const isSingleCol =
      gridCols.split(" ").length === 1 || !gridCols.includes(" ");

    return {
      gridCols,
      singleColumn: isSingleCol,
      addDisplay: getComputedStyle(add).display,
      addAlignItems: getComputedStyle(add).alignItems,
      addOverflow: ar.right > cr.right + 1,
      allOverflow: alr.right > cr.right + 1,
      buttonsOverflow: br.right > cr.right + 1,
      addWidth: Math.round(ar.width),
      containerWidth: Math.round(cr.width),
      vAlignDelta: Math.round(textCy - iconCy),
      spacerDisplay: spacer ? getComputedStyle(spacer).display : null,
      centerDeltaPx: Math.abs(
        Math.round(ar.left + ar.width / 2 - (ar.left + ar.width / 2)) -
          Math.round(
            (add
              .querySelector(".sarjan-add-set-btn__inner")
              ?.getBoundingClientRect().left ?? 0) +
              (add
                .querySelector(".sarjan-add-set-btn__inner")
                ?.getBoundingClientRect().width ?? 0) /
                2 -
              (ar.left + ar.width / 2),
          ),
      ),
      innerCenterDelta: (() => {
        const inner = add.querySelector(".sarjan-add-set-btn__inner");
        if (!inner) return null;
        const ir = inner.getBoundingClientRect();
        return Math.abs(
          Math.round(ir.left + ir.width / 2 - (ar.left + ar.width / 2)),
        );
      })(),
    };
  }, context);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const issues = [];

  for (const width of WIDTHS) {
    const page = await browser.newPage({
      viewport: { width, height: 844 },
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

    // PDP
    await page.goto(`${BASE}${href}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    const pdp = await checkButtons(page, "pdp");
    console.log(`\n[${width}px] PDP:`, JSON.stringify(pdp, null, 2));

    if (pdp.error) issues.push(`${width}px PDP: ${pdp.error}`);
    else {
      if (!pdp.singleColumn)
        issues.push(`${width}px PDP: not single column (${pdp.gridCols})`);
      if (pdp.addOverflow || pdp.allOverflow)
        issues.push(`${width}px PDP: button overflows container`);
      if (pdp.vAlignDelta > 2)
        issues.push(`${width}px PDP: All colors v-align ${pdp.vAlignDelta}px`);
      if (pdp.addDisplay !== "grid")
        issues.push(`${width}px PDP: add btn display=${pdp.addDisplay}`);
      if (pdp.innerCenterDelta > 3)
        issues.push(
          `${width}px PDP: text off-center ${pdp.innerCenterDelta}px`,
        );
      if (width <= 767 && pdp.spacerDisplay && pdp.spacerDisplay !== "none")
        issues.push(`${width}px PDP: spacer should be hidden`);
    }

    // Quick view
    await page.goto(`${BASE}/products`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.locator("[data-quick-view]").first().click();
    await page.waitForSelector(".modal-quick-view .sarjan-add-set-btn", {
      timeout: 15000,
    });
    const qv = await checkButtons(page, "quickView");
    console.log(`[${width}px] Quick view:`, JSON.stringify(qv, null, 2));

    if (qv.error) issues.push(`${width}px QV: ${qv.error}`);
    else {
      if (!qv.singleColumn)
        issues.push(`${width}px QV: not single column (${qv.gridCols})`);
      if (qv.addOverflow || qv.allOverflow)
        issues.push(`${width}px QV: button overflows container`);
      if (qv.vAlignDelta > 2)
        issues.push(`${width}px QV: All colors v-align ${qv.vAlignDelta}px`);
      if (qv.addDisplay !== "grid")
        issues.push(`${width}px QV: add btn display=${qv.addDisplay}`);
      if (qv.innerCenterDelta > 3)
        issues.push(`${width}px QV: text off-center ${qv.innerCenterDelta}px`);
      if (width <= 767 && qv.spacerDisplay && qv.spacerDisplay !== "none")
        issues.push(`${width}px QV: spacer should be hidden`);
    }

    await page.close();
  }

  await browser.close();

  if (issues.length) {
    console.log("\nFAIL:");
    for (const i of issues) console.log(" -", i);
    process.exit(1);
  }
  console.log(
    "\nPASS — mobile PDP + quick view buttons OK at",
    WIDTHS.join(", "),
    "px",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
