import { expect, type Page } from "@playwright/test";
import type { AuditStatus } from "./audit-log";
import { recordFinding } from "./audit-log";
import { dismissCookieBanner } from "./helpers";

export type ViewportPreset = {
  name: string;
  width: number;
  height: number;
};

export const VIEWPORTS: ViewportPreset[] = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

export const STOREFRONT_PAGES = [
  { path: "/", label: "Homepage" },
  { path: "/products", label: "Products" },
  { path: "/login", label: "Login" },
  { path: "/register", label: "Register" },
  { path: "/contact", label: "Contact" },
  { path: "/cart", label: "Cart" },
  { path: "/checkout", label: "Checkout" },
  { path: "/my-account", label: "My Account" },
  { path: "/about", label: "About" },
  { path: "/blog", label: "Blog" },
];

export const ADMIN_PAGES = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/customers", label: "Customers" },
  { path: "/admin/orders", label: "Orders" },
  { path: "/admin/dispatch", label: "Dispatch" },
  { path: "/admin/products-list", label: "Products List" },
  { path: "/admin/products-create", label: "Products Create" },
  { path: "/admin/commerce-hub", label: "Commerce Hub" },
  { path: "/admin/products-low", label: "Low Stock" },
  { path: "/admin/pricing", label: "Pricing" },
  { path: "/admin/send-notifications", label: "Notifications" },
  { path: "/admin/settings", label: "Settings" },
  { path: "/admin/home", label: "Home CMS" },
  { path: "/admin/header-menu", label: "Header Menu" },
  { path: "/admin/testimonials", label: "Testimonials" },
  { path: "/admin/blogs-list", label: "Blogs" },
  { path: "/admin/contact-inquiries", label: "Inquiries" },
  { path: "/admin/reports", label: "Reports" },
  { path: "/admin/audit", label: "Audit Log" },
];

function qa(
  category: string,
  check: string,
  status: AuditStatus,
  detail: string,
) {
  recordFinding({ area: "Senior QA", category, check, status, detail });
}

export async function setViewport(page: Page, vp: ViewportPreset) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
}

export async function gotoAndSettle(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await dismissCookieBanner(page);
  await page.waitForTimeout(400);
  return response;
}

export async function auditPageLoad(
  page: Page,
  path: string,
  label: string,
  viewport: string,
) {
  const check = `${label} @ ${viewport}`;
  try {
    const response = await gotoAndSettle(page, path);
    const status = response?.status() ?? 0;
    if (response && status >= 200 && status < 400) {
      qa("Pages", check, "PASS", `${status} ${path}`);
      return true;
    }
    qa("Pages", check, "FAIL", `${status || "no response"} ${path}`);
    return false;
  } catch (error) {
    qa("Pages", check, "FAIL", String(error).slice(0, 120));
    return false;
  }
}

export async function auditLayoutNoOverflow(
  page: Page,
  label: string,
  viewport: string,
) {
  const check = `${label} layout @ ${viewport}`;
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const maxW = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientW = doc.clientWidth;
    return { maxW, clientW, delta: maxW - clientW };
  });
  if (overflow.delta <= 8) {
    qa(
      "Layout",
      check,
      "PASS",
      `scroll ${overflow.maxW}px / viewport ${overflow.clientW}px`,
    );
  } else {
    qa(
      "Layout",
      check,
      "FAIL",
      `horizontal overflow ${overflow.delta}px (${overflow.maxW} > ${overflow.clientW})`,
    );
  }
}

export async function auditTypography(
  page: Page,
  label: string,
  viewport: string,
) {
  const check = `${label} text @ ${viewport}`;
  const stats = await page.evaluate(() => {
    const body = document.body;
    const text = (body.innerText ?? "").replace(/\s+/g, " ").trim();
    const h = document.querySelector("h1, h2, h3, .heading");
    const heading = h ? (h.textContent ?? "").trim() : "";
    const bodyFont = getComputedStyle(body).fontFamily;
    const bodySize = getComputedStyle(body).fontSize;
    return { len: text.length, heading, bodyFont, bodySize };
  });
  if (stats.len >= 40) {
    qa(
      "Typography",
      check,
      "PASS",
      `${stats.len} chars; font ${stats.bodyFont.slice(0, 40)} ${stats.bodySize}`,
    );
  } else {
    qa("Typography", check, "WARN", `Low visible text (${stats.len} chars)`);
  }
}

export async function auditFormFields(
  page: Page,
  label: string,
  viewport: string,
) {
  const check = `${label} fields @ ${viewport}`;
  const fields = await page.evaluate(() => {
    function hasFieldLabel(el: HTMLElement): boolean {
      if (el.getAttribute("aria-label")?.trim()) return true;
      if (el.getAttribute("placeholder")?.trim()) return true;
      if (el.getAttribute("name")?.trim()) return true;
      if (el.getAttribute("title")?.trim()) return true;
      const id = el.id;
      if (id && document.querySelector(`label[for="${id}"]`)) return true;
      const fieldset = el.closest("fieldset");
      if (fieldset) {
        const legend = fieldset.querySelector(
          ".body-title, .text-button, .form-label, label, h5, h6",
        );
        if (legend?.textContent?.trim()) return true;
      }
      let node: HTMLElement | null = el.parentElement;
      for (let depth = 0; node && depth < 4; depth += 1) {
        const nearby = node.querySelector(
          ":scope > .body-title, :scope > .text-button, :scope > .form-label, :scope > label, :scope > h5, :scope > h6",
        );
        if (nearby?.textContent?.trim()) return true;
        node = node.parentElement;
      }
      return false;
    }

    const els = [
      ...document.querySelectorAll<HTMLElement>(
        "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled])",
      ),
    ];
    let visible = 0;
    let labeled = 0;
    let inViewport = 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const el of els) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      visible += 1;
      if (hasFieldLabel(el)) labeled += 1;
      if (
        rect.top < vh &&
        rect.bottom > 0 &&
        rect.left < vw &&
        rect.right > 0
      ) {
        inViewport += 1;
      }
    }
    return { total: els.length, visible, labeled, inViewport };
  });

  if (fields.visible === 0) {
    qa("Forms", check, "SKIP", "No visible form fields on page");
    return;
  }
  const labelPct = Math.round((fields.labeled / fields.visible) * 100);
  if (labelPct >= 80) {
    qa(
      "Forms",
      check,
      "PASS",
      `${fields.visible} visible, ${fields.inViewport} in viewport, ${labelPct}% labeled`,
    );
  } else if (labelPct >= 50) {
    qa(
      "Forms",
      check,
      "WARN",
      `${fields.visible} visible; only ${labelPct}% have label/placeholder/name`,
    );
  } else {
    qa(
      "Forms",
      check,
      "FAIL",
      `${fields.visible} visible; ${labelPct}% labeled (expected ≥80%)`,
    );
  }
}

export async function auditButtons(
  page: Page,
  label: string,
  viewport: string,
) {
  const check = `${label} buttons @ ${viewport}`;
  const buttons = await page.evaluate(() => {
    const els = [
      ...document.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a.btn, a.tf-btn, [role='button']",
      ),
    ];
    let visible = 0;
    let sized = 0;
    let named = 0;
    for (const el of els) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      visible += 1;
      if (rect.width >= 24 && rect.height >= 24) sized += 1;
      const name =
        (el.textContent ?? "").trim() || el.getAttribute("aria-label");
      if (name) named += 1;
    }
    return { visible, sized, named };
  });

  if (buttons.visible === 0) {
    qa("Buttons", check, "WARN", "No visible buttons (may be link-only page)");
    return;
  }
  const touchOk = buttons.sized >= Math.min(buttons.visible, 1);
  const namedOk = buttons.named >= Math.ceil(buttons.visible * 0.7);
  if (touchOk && namedOk) {
    qa(
      "Buttons",
      check,
      "PASS",
      `${buttons.visible} visible, ${buttons.sized} touch-sized (≥24px), ${buttons.named} named`,
    );
  } else if (touchOk) {
    qa(
      "Buttons",
      check,
      "WARN",
      `${buttons.visible} buttons; some missing visible text/aria-label`,
    );
  } else {
    qa(
      "Buttons",
      check,
      "FAIL",
      `${buttons.visible} buttons; only ${buttons.sized} meet 24px min touch target`,
    );
  }
}

export async function auditTables(page: Page, label: string, viewport: string) {
  const check = `${label} tables @ ${viewport}`;
  const tables = await page.evaluate(() => {
    const els = [...document.querySelectorAll("table")];
    if (!els.length) return null;
    let best = { headers: 0, rows: 0, scrollable: false };
    for (const table of els) {
      const headers = table.querySelectorAll("th").length;
      const rows = table.querySelectorAll("tbody tr").length;
      const wrap = table.closest(
        ".table-responsive, .overflow-auto, .dataTables_wrapper",
      );
      if (headers + rows > best.headers + best.rows) {
        best = { headers, rows, scrollable: !!wrap };
      }
    }
    return best;
  });

  if (!tables) {
    qa("Tables", check, "SKIP", "No table on page");
    return;
  }
  if (tables.headers >= 1 && tables.rows >= 0) {
    qa(
      "Tables",
      check,
      "PASS",
      `${tables.headers} columns, ${tables.rows} data rows${tables.scrollable ? ", responsive wrapper" : ""}`,
    );
  } else {
    qa(
      "Tables",
      check,
      "WARN",
      `Table found but ${tables.headers} headers / ${tables.rows} rows`,
    );
  }
}

export async function auditCssOnPage(page: Page, label: string) {
  const check = `${label} CSS`;
  const css = await page.evaluate(() => {
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
    const loaded = links.filter((l) => (l as HTMLLinkElement).href).length;
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const hasBootstrap = links.some((l) =>
      (l as HTMLLinkElement).href.includes("bootstrap"),
    );
    return { loaded, bodyBg, hasBootstrap };
  });
  if (css.loaded >= 3) {
    qa(
      "CSS",
      check,
      "PASS",
      `${css.loaded} stylesheets; bootstrap=${css.hasBootstrap}`,
    );
  } else {
    qa("CSS", check, "FAIL", `Only ${css.loaded} stylesheets loaded`);
  }
}

export async function auditImages(page: Page, label: string) {
  const check = `${label} images`;
  await page.evaluate(async () => {
    const lazyRoot = (
      window as Window & { lazySizes?: { loader: { checkElems: () => void } } }
    ).lazySizes;
    lazyRoot?.loader.checkElems();
    document
      .querySelector(".sarjan-instagram-gallery-section")
      ?.scrollIntoView({ block: "center" });
    const imgs = [...document.querySelectorAll("img")];
    for (const img of imgs) {
      img.scrollIntoView({ block: "nearest" });
    }
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 2500);
          }),
      ),
    );
  });
  const result = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].slice(0, 50);
    const broken: string[] = [];
    const external: string[] = [];
    let ok = 0;
    for (const img of imgs) {
      const dataSrc = img.getAttribute("data-src");
      const src = img.currentSrc || img.src || dataSrc || "";
      if (!src || src.startsWith("data:")) continue;
      if (/fbcdn\.net|instagram\.com|cdninstagram/i.test(src)) {
        external.push(src);
        continue;
      }
      const pendingLazy =
        img.classList.contains("lazyload") && dataSrc && img.naturalWidth === 0;
      if (pendingLazy && dataSrc.startsWith("/")) {
        ok += 1;
        continue;
      }
      if (!img.complete || img.naturalWidth === 0) broken.push(src);
      else ok += 1;
    }
    return { broken, external: external.length, ok, total: imgs.length };
  });

  if (result.broken.length === 0) {
    qa(
      "Images",
      check,
      "PASS",
      `${result.ok}/${result.total} OK${result.external ? `; ${result.external} CDN skipped` : ""}`,
    );
  } else {
    qa(
      "Images",
      check,
      "FAIL",
      `${result.broken.length} broken: ${result.broken.slice(0, 2).join(" | ").slice(0, 100)}`,
    );
  }
}

export async function auditAdminChrome(page: Page, label: string) {
  const check = `${label} admin chrome`;
  const chrome = await page.evaluate(() => {
    const sidebar = !!document.querySelector(
      ".sidebar, .section-menu-left, nav.menu",
    );
    const header = !!document.querySelector("header, .header-dashboard");
    const title = (
      document.querySelector("h1, h2, .heading, .text-title")?.textContent ?? ""
    ).trim();
    return { sidebar, header, title: title.slice(0, 60) };
  });
  if (chrome.sidebar && chrome.header) {
    qa("Admin UI", check, "PASS", `sidebar+header; title="${chrome.title}"`);
  } else if (chrome.header || chrome.sidebar) {
    qa(
      "Admin UI",
      check,
      "WARN",
      `partial chrome sidebar=${chrome.sidebar} header=${chrome.header}`,
    );
  } else {
    qa("Admin UI", check, "FAIL", "Admin layout chrome not detected");
  }
}

export async function auditFullPage(
  page: Page,
  path: string,
  label: string,
  viewport: ViewportPreset,
  opts: { forms?: boolean; tables?: boolean; admin?: boolean } = {},
) {
  await setViewport(page, viewport);
  const loaded = await auditPageLoad(page, path, label, viewport.name);
  if (!loaded) return;
  await auditLayoutNoOverflow(page, label, viewport.name);
  await auditTypography(page, label, viewport.name);
  await auditButtons(page, label, viewport.name);
  if (opts.forms) await auditFormFields(page, label, viewport.name);
  if (opts.tables) await auditTables(page, label, viewport.name);
  if (opts.admin) await auditAdminChrome(page, label);
  if (viewport.name === "desktop") {
    await auditCssOnPage(page, label);
    await auditImages(page, label);
  }
}

/** Waits for register form GST field (Suspense client component). */
export async function waitForRegisterForm(page: Page) {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await dismissCookieBanner(page);
  await expect(page.locator('input[name="gst"]')).toBeVisible({
    timeout: 20_000,
  });
}
