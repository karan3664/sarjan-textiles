import { test, expect } from "@playwright/test";
import { dismissCookieBanner, loginAdmin } from "./helpers";

/**
 * End-to-end: public site → API check → admin login → CMS.
 * Video saved automatically (playwright.config video: "on").
 */
test("full journey — storefront, API, admin CMS", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  await page.goto("/");
  await dismissCookieBanner(page);
  await expect(page).toHaveTitle(/Sarjan/i);

  const homepageApi = await request.get("/api/homepage");
  expect(homepageApi.ok()).toBeTruthy();

  await loginAdmin(page);
  await page.goto("/admin/cms");
  await expect(page.locator("body")).toContainText(/cms|content|home/i);

  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
