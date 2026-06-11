import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { getAdminLoginPath } from "../src/lib/admin-login-path";

export const adminLoginPath = getAdminLoginPath();

export const adminEmail =
  process.env.PLAYWRIGHT_ADMIN_EMAIL ??
  process.env.ADMIN_EMAIL ??
  "admin@sarjantextiles.com";

export const adminPassword =
  process.env.PLAYWRIGHT_ADMIN_PASSWORD ??
  process.env.ADMIN_PASSWORD ??
  "admin123";

export async function apiOk(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(response.ok(), `${path} should return 2xx`).toBeTruthy();
  return response;
}

export async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole("button", { name: /accept/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

/** Sets admin session via API (shares cookie jar with page) — reliable for E2E. */
export async function loginAdmin(page: Page) {
  await dismissCookieBanner(page);

  const response = await page.request.post("/api/admin/auth/login", {
    data: { email: adminEmail, password: adminPassword },
  });
  expect(response.ok(), "admin API login should succeed").toBeTruthy();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin(?!\/login)/);
}

/** Optional: exercise the HTML login form (UI path). */
export async function loginAdminViaForm(page: Page) {
  await page.goto(adminLoginPath);
  await dismissCookieBanner(page);
  await page.getByPlaceholder("Admin email").fill(adminEmail);
  await page.getByPlaceholder("Password").fill(adminPassword);
  await page.getByRole("button", { name: /^login$/i }).click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/);
}
