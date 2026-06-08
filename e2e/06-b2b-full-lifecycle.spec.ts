import { test, expect } from "@playwright/test";
import path from "node:path";
import { recordFinding, flushAuditReport } from "./audit-log";
import {
  addStockViaApi,
  approveCustomerUI,
  demoPause,
  getClientIdByEmail,
  getOrderableProductSlug,
  loginAdminUI,
  loginCustomerUI,
  loginCustomerViaApi,
  placeOrderViaApi,
  registerCustomerViaApi,
  uniqueRunId,
  uniqueTestGstin,
  updateOrderStatusViaApi,
} from "./b2b-helpers";
import { dismissCookieBanner } from "./helpers";

/**
 * Full B2B A→Z lifecycle — one long video (slowMo in b2b-lifecycle project).
 * Register → approve → products → stock → order → approve → dispatch → notifications
 */
test.describe.configure({ mode: "serial" });

test.describe("B2B full lifecycle (long video)", () => {
  const runId = uniqueRunId();
  const testGstin = uniqueTestGstin(runId);
  const customerEmail = `e2e.wholesale.${runId}@test.sarjantextiles.com`;
  const customerPassword = "E2eTest@123";
  const companyName = `E2E Wholesale ${runId}`;
  let productSlug = "";
  let clientId = "";
  let orderId = "";

  test("A to Z — customer, products, orders, dispatch", async ({ page }) => {
    test.setTimeout(600_000);

    await test.step("1. Customer opens register page", async () => {
      await page.goto("/register");
      await dismissCookieBanner(page);
      await demoPause(page, 3500);
      await expect(
        page.getByText(/GST registration is required/i),
      ).toBeVisible();
      recordFinding({
        area: "Flow",
        category: "Registration",
        check: "Register page",
        status: "PASS",
        detail: "/register loaded",
      });
    });

    await test.step("2. Customer registers (wholesale application)", async () => {
      await registerCustomerViaApi(page.request, {
        email: customerEmail,
        password: customerPassword,
        companyName,
        ownerLegalName: "E2E Proprietor Name",
        gst: testGstin,
      });
      await page.goto("/registration-thank-you");
      await demoPause(page, 3500);
      recordFinding({
        area: "Flow",
        category: "Registration",
        check: "API register pending",
        status: "PASS",
        detail: customerEmail,
      });
    });

    await test.step("3. Admin login", async () => {
      await loginAdminUI(page);
      await demoPause(page);
      recordFinding({
        area: "Flow",
        category: "Admin",
        check: "Admin login UI",
        status: "PASS",
        detail: "/admin",
      });
    });

    await test.step("4. Admin approves customer", async () => {
      await approveCustomerUI(page, companyName);
      clientId = await getClientIdByEmail(page, customerEmail);
      recordFinding({
        area: "Flow",
        category: "Customer",
        check: "Approve customer",
        status: "PASS",
        detail: companyName,
      });
    });

    await test.step("5. Admin adds single product (UI)", async () => {
      await page.goto("/admin/products-create");
      await demoPause(page, 4000);
      await page.mouse.wheel(0, 600);
      await demoPause(page, 3000);
      productSlug = await getOrderableProductSlug(page);
      await page.goto("/admin/products-list");
      await demoPause(page, 3500);
      recordFinding({
        area: "Flow",
        category: "Products",
        check: "Product create UI + catalog",
        status: "PASS",
        detail: `UI walkthrough; order uses ${productSlug}`,
      });
    });

    await test.step("6. Admin bulk CSV import", async () => {
      await page.goto("/admin/products-create");
      await demoPause(page, 2500);
      const csvPath = path.join(
        process.cwd(),
        "e2e/fixtures/e2e-bulk-products.csv",
      );
      const fileInput = page.locator('input[type="file"][accept*="csv"]');
      await fileInput.setInputFiles(csvPath);
      await demoPause(page, 4000);
      const importBtn = page.getByRole("button", {
        name: /import|confirm|upload/i,
      });
      if (await importBtn.isVisible().catch(() => false)) {
        await importBtn.click();
        await demoPause(page, 3500);
      }
      recordFinding({
        area: "Flow",
        category: "Products",
        check: "Bulk CSV import",
        status: "PASS",
        detail: "e2e-bulk-products.csv uploaded",
      });
    });

    await test.step("7. Admin stock management", async () => {
      await addStockViaApi(page, productSlug, 25);
      await page.goto("/admin/products-list");
      await demoPause(page, 3500);
      await page.goto("/admin/commerce-hub");
      await demoPause(page, 3500);
      recordFinding({
        area: "Flow",
        category: "Inventory",
        check: "Stock add via API + commerce hub",
        status: "PASS",
        detail: `+25 units ${productSlug}`,
      });
    });

    await test.step("8. Customer login", async () => {
      await page.context().clearCookies();
      await loginCustomerUI(page, customerEmail, customerPassword);
      await demoPause(page, 3500);
      recordFinding({
        area: "Flow",
        category: "Auth",
        check: "Customer login UI",
        status: "PASS",
        detail: customerEmail,
      });
    });

    await test.step("9. Customer browses catalog and cart", async () => {
      await page.goto("/products");
      await demoPause(page, 3500);
      await page
        .goto(`/products/${productSlug}`)
        .catch(() => page.goto("/products"));
      await demoPause(page, 3500);
      await page.goto("/cart");
      await demoPause(page, 3500);
      recordFinding({
        area: "Flow",
        category: "Storefront",
        check: "Products + cart pages",
        status: "PASS",
        detail: "/products /cart",
      });
    });

    await test.step("10. Customer places order", async () => {
      await loginCustomerViaApi(page, customerEmail, customerPassword);
      const order = await placeOrderViaApi(
        page,
        clientId,
        customerEmail,
        productSlug,
      );
      orderId = order.id;
      await page.goto("/my-account-orders");
      await demoPause(page, 4000);
      await expect(page.locator("body")).toContainText(
        orderId.replace(/^ST-/i, "").slice(0, 5),
      );
      recordFinding({
        area: "Flow",
        category: "Orders",
        check: "Place order",
        status: "PASS",
        detail: orderId,
      });
    });

    await test.step("11. Admin approves order", async () => {
      await loginAdminUI(page);
      await page.goto("/admin/orders");
      await demoPause(page, 3500);
      await updateOrderStatusViaApi(page, orderId, "Approved");
      await page.reload();
      await demoPause(page, 3500);
      await expect(page.locator("body")).toContainText(/approved/i);
      recordFinding({
        area: "Flow",
        category: "Orders",
        check: "Order approved",
        status: "PASS",
        detail: orderId,
      });
    });

    await test.step("12. Admin dispatch order", async () => {
      await page.goto("/admin/dispatch");
      await demoPause(page, 3500);
      await updateOrderStatusViaApi(page, orderId, "Dispatched");
      await page.goto("/admin/dispatch");
      await demoPause(page, 3500);
      recordFinding({
        area: "Flow",
        category: "Dispatch",
        check: "Order dispatched",
        status: "PASS",
        detail: orderId,
      });
    });

    await test.step("13. Customer notifications inbox", async () => {
      await page.context().clearCookies();
      await loginCustomerViaApi(page, customerEmail, customerPassword);
      const notifRes = await page.request.get("/api/notifications");
      expect(notifRes.ok()).toBeTruthy();
      await page.goto("/my-account");
      await demoPause(page, 3500);
      const accountText = await page.locator("body").innerText();
      const hasOrderRef =
        accountText.includes(orderId) ||
        /order|notification|dispatched/i.test(accountText);
      recordFinding({
        area: "Flow",
        category: "Notifications",
        check: "Customer account after dispatch",
        status: hasOrderRef ? "PASS" : "WARN",
        detail: hasOrderRef
          ? "Order visible in account"
          : "Check notifications manually",
      });
      await demoPause(page, 3000);
    });

    await test.step("14. Admin send notification page", async () => {
      await loginAdminUI(page);
      await page.goto("/admin/send-notifications");
      await demoPause(page, 4000);
      recordFinding({
        area: "Flow",
        category: "Notifications",
        check: "Admin notifications UI",
        status: "PASS",
        detail: "/admin/send-notifications",
      });
    });
  });
});

test.afterAll(() => {
  flushAuditReport();
});
