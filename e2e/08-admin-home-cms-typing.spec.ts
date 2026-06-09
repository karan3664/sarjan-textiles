import { test, expect } from "@playwright/test";
import { loginAdmin } from "./helpers";

test.describe("Admin Home CMS typing", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/admin/home");
    await expect(page.getByText("Home Page Content")).toBeVisible();
  });

  test("category card title keeps focus while typing", async ({ page }) => {
    const card = page.locator(".sarjan-category-editor-card").first();
    await card.scrollIntoViewIfNeeded();
    const editor = card.locator(".sarjan-tiptap-surface").first();
    await editor.click();
    await page.keyboard.type("QA", { delay: 40 });
    await expect(editor).toContainText("QA");
    await expect(editor).toBeFocused();
  });

  test("font size and family menus open and apply a style", async ({
    page,
  }) => {
    const card = page.locator(".sarjan-category-editor-card").first();
    await card.scrollIntoViewIfNeeded();
    const editor = card.locator(".sarjan-tiptap-surface").first();
    await editor.click();
    await page.keyboard.type("Dropdown test", { delay: 20 });
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+A" : "Control+A",
    );

    const sizeMenu = card.locator('[data-toolbar-menu="font-size"]');
    await sizeMenu
      .locator(".sarjan-editor-toolbar-menu-trigger")
      .click({ force: true });
    await expect(
      sizeMenu.locator(".sarjan-editor-toolbar-menu-list"),
    ).toBeVisible();
    await sizeMenu.getByRole("option", { name: "20px" }).click();
    await expect(
      sizeMenu.locator(".sarjan-editor-toolbar-menu-list"),
    ).toBeHidden();

    const fontMenu = card.locator('[data-toolbar-menu="font-family"]');
    await fontMenu
      .locator(".sarjan-editor-toolbar-menu-trigger")
      .click({ force: true });
    await expect(
      fontMenu.locator(".sarjan-editor-toolbar-menu-list"),
    ).toBeVisible();
    await fontMenu.getByRole("option", { name: "Poppins" }).click();
    await expect(
      fontMenu.locator(".sarjan-editor-toolbar-menu-list"),
    ).toBeHidden();
    await expect(editor).toContainText("Dropdown test");
  });

  test("heading preview does not show raw html tags", async ({ page }) => {
    const previews = page.locator(
      ".sarjan-heading-preview h6, .sarjan-heading-preview p",
    );
    const count = await previews.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const text = await previews.nth(i).innerText();
      expect(text).not.toMatch(/<\/?p>/i);
    }
  });
});
