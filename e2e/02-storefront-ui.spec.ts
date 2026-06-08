import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

test.describe("Storefront UI", () => {
  test("homepage loads with Sarjan branding", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);
    await expect(page).toHaveTitle(/Sarjan/i);
    await expect(page.locator("body")).toBeVisible();
  });

  test("shop / catalog navigation", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    const shopLink = page
      .getByRole("link", { name: /shop|catalog|products/i })
      .first();
    if (await shopLink.isVisible().catch(() => false)) {
      await shopLink.click();
      await expect(page).not.toHaveURL(/^\/$/);
    } else {
      await page.goto("/products");
    }

    await expect(page.locator("body")).toContainText(
      /Sarjan|product|shop|catalog/i,
    );
  });

  test("login page reachable", async ({ page }) => {
    await page.goto("/login");
    await dismissCookieBanner(page);
    await expect(page.locator("body")).toContainText(
      /login|sign in|otp|email/i,
    );
  });

  test("contact or about page", async ({ page }) => {
    await page.goto("/contact");
    await dismissCookieBanner(page);
    await expect(page.locator("body")).toBeVisible();
  });
});
