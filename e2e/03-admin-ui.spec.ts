import { test, expect } from "@playwright/test";
import { loginAdmin, loginAdminViaForm } from "./helpers";

test.describe("Admin UI", () => {
  test("admin login and dashboard", async ({ page }) => {
    await loginAdmin(page);
    await expect(page.locator("body")).toContainText(
      /dashboard|admin|orders|cms/i,
    );
  });

  test("admin login form submits", async ({ page }) => {
    await loginAdminViaForm(page);
    await expect(page.locator("body")).toContainText(
      /dashboard|admin|orders|cms/i,
    );
  });

  test("admin CMS section opens", async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/admin/cms");
    await expect(page.locator("body")).toContainText(/cms|content|home|page/i);
  });
});
