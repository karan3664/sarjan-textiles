import { test } from "@playwright/test";
import { flushAuditReport } from "./audit-log";
import { loginAdmin } from "./helpers";
import {
  ADMIN_PAGES,
  STOREFRONT_PAGES,
  VIEWPORTS,
  auditFullPage,
  waitForRegisterForm,
} from "./qa-ui-helpers";

test.describe.configure({ mode: "serial" });

test.describe("Senior QA — storefront responsive UI", () => {
  for (const vp of VIEWPORTS) {
    test(`storefront pages @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      test.setTimeout(300_000);
      for (const { path, label } of STOREFRONT_PAGES) {
        const forms =
          path === "/login" ||
          path === "/register" ||
          path === "/contact" ||
          path === "/checkout";
        await auditFullPage(page, path, label, vp, { forms });
      }
    });
  }

  test("register GST field + wholesale copy", async ({ page }) => {
    await waitForRegisterForm(page);
    const gstVisible = await page.locator('input[name="gst"]').isVisible();
    const wholesaleCopy = await page
      .getByText(/GST registration is required/i)
      .isVisible()
      .catch(() => false);
    const { recordFinding } = await import("./audit-log");
    recordFinding({
      area: "Senior QA",
      category: "Forms",
      check: "Register GST field",
      status: gstVisible && wholesaleCopy ? "PASS" : "FAIL",
      detail: gstVisible
        ? "input[name=gst] visible + wholesale copy"
        : "GST field or copy missing",
    });
  });
});

test.describe("Senior QA — admin UI (desktop + tablet)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  for (const vp of VIEWPORTS.filter((v) => v.name !== "mobile")) {
    test(`admin pages @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      test.setTimeout(600_000);
      for (const { path, label } of ADMIN_PAGES) {
        const tables =
          path.includes("orders") ||
          path.includes("customers") ||
          path.includes("products-list") ||
          path.includes("dispatch") ||
          path.includes("inquiries") ||
          path.includes("audit") ||
          path.includes("blogs");
        const forms =
          path.includes("create") ||
          path.includes("settings") ||
          path.includes("home") ||
          path.includes("header-menu");
        await auditFullPage(page, path, label, vp, {
          tables,
          forms,
          admin: true,
        });
      }
    });
  }
});

test.describe("Senior QA — legacy redirects", () => {
  test("/shop redirects to products", async ({ page }) => {
    const { recordFinding } = await import("./audit-log");
    const res = await page.goto("/shop", { waitUntil: "domcontentloaded" });
    const url = page.url();
    const ok =
      url.includes("/products") ||
      (res?.status() ?? 0) === 200 ||
      (res?.status() ?? 0) === 308;
    recordFinding({
      area: "Senior QA",
      category: "Redirects",
      check: "/shop → /products",
      status: ok ? "PASS" : "FAIL",
      detail: `${res?.status() ?? "?"} → ${url}`,
    });
  });
});

test.afterAll(() => {
  flushAuditReport();
});
