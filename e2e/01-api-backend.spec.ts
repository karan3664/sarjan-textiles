import { test, expect } from "@playwright/test";
import { apiOk } from "./helpers";

test.describe("Backend API smoke", () => {
  test("health endpoint", async ({ request }) => {
    const response = await apiOk(request, "/api/health");
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("sarjan-textiles");
  });

  test("homepage API returns CMS payload", async ({ request }) => {
    const response = await apiOk(request, "/api/homepage");
    const body = await response.json();
    expect(body.siteSettings?.brandName).toBeTruthy();
    expect(Array.isArray(body.products)).toBe(true);
  });

  test("categories and inventory APIs", async ({ request }) => {
    const categories = await apiOk(request, "/api/categories");
    const categoriesBody = await categories.json();
    expect(Array.isArray(categoriesBody.categories ?? categoriesBody)).toBe(
      true,
    );

    const inventory = await apiOk(request, "/api/inventory");
    const inventoryBody = await inventory.json();
    expect(inventoryBody).toBeTruthy();
  });

  test("auth session without token is unauthenticated", async ({ request }) => {
    const response = await request.get("/api/auth/session");
    expect(response.status()).toBe(401);
  });

  test("admin login API", async ({ request }) => {
    const response = await request.post("/api/admin/auth/login", {
      data: {
        email: process.env.ADMIN_EMAIL ?? "admin@sarjantextiles.com",
        password: process.env.ADMIN_PASSWORD ?? "admin123",
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.admin?.email).toBeTruthy();
    expect(body.token).toBeTruthy();
  });
});
