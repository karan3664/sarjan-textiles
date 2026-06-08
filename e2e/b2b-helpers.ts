import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { adminEmail, adminPassword, dismissCookieBanner } from "./helpers";

export const DEMO_PAUSE_MS = 2800;

export async function demoPause(page: Page, ms = DEMO_PAUSE_MS) {
  await page.waitForTimeout(ms);
}

export function uniqueRunId() {
  return Date.now().toString().slice(-8);
}

/** Valid-format unique GSTIN for E2E (not a real taxpayer). */
export function uniqueTestGstin(runId = uniqueRunId()) {
  const digits = runId.replace(/\D/g, "").padStart(4, "0").slice(-4);
  return `24AABCU${digits}M1Z5`;
}

export async function registerCustomerViaApi(
  request: APIRequestContext,
  input: {
    email: string;
    password: string;
    companyName: string;
    ownerLegalName: string;
    gst?: string;
    mobile?: string;
  },
) {
  const otpRes = await request.post("/api/auth/send-otp", {
    data: { email: input.email },
  });
  expect(otpRes.ok(), "send-otp should succeed").toBeTruthy();
  const otpData = await otpRes.json();
  const devOtp = otpData.devOtp as string | undefined;
  expect(devOtp, "E2E_EXPOSE_OTP must be enabled").toBeTruthy();

  const regRes = await request.post("/api/auth/register", {
    data: {
      email: input.email,
      password: input.password,
      gst: input.gst ?? uniqueTestGstin(),
      companyName: input.companyName,
      ownerLegalName: input.ownerLegalName,
      city: "Bhuj",
      state: "Gujarat",
      mobile:
        input.mobile ??
        `9${uniqueRunId().replace(/\D/g, "").padStart(9, "0").slice(-9)}`,
      emailOtp: devOtp,
      emailOtpToken: otpData.otpToken,
    },
  });
  const regBody = await regRes.json();
  expect(
    regRes.ok(),
    `register failed: ${JSON.stringify(regBody)}`,
  ).toBeTruthy();
  return regBody;
}

export async function loginCustomerViaApi(
  page: Page,
  email: string,
  password: string,
) {
  const res = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

export async function loginCustomerUI(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await dismissCookieBanner(page);
  await page.getByPlaceholder(/username or email/i).fill(email);
  await page.locator('input[name="password"]').first().fill(password);
  await page.getByRole("button", { name: /log in|login|sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function loginAdminUI(page: Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("Admin email").fill(adminEmail);
  await page.getByPlaceholder("Password").fill(adminPassword);
  await page.getByRole("button", { name: /^login$/i }).click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/);
}

export async function approveCustomerUI(page: Page, companyName: string) {
  await page.goto("/admin/customers");
  await demoPause(page);
  await page.locator(".tf-select select").selectOption("pending");
  await page.getByPlaceholder("Search customer").fill(companyName);
  await demoPause(page, 1500);
  const card = page
    .locator(".sarjan-customer-card")
    .filter({ hasText: companyName })
    .first();
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await demoPause(page);
  const approveResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/api/admin/customers") &&
      res.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: /approve customer/i }).click();
  await approveResponse;
  await demoPause(page);
  await expect(page.locator("body")).toContainText(/approved/i);
}

export async function getOrderableProductSlug(page: Page) {
  const res = await page.request.get("/api/catalog/products?limit=20");
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  const items = (data.items ?? data.products ?? []) as {
    slug: string;
    stock?: number;
    moq?: number;
    name?: string;
  }[];
  const pick = items.find((p) => (p.stock ?? 0) >= (p.moq ?? 1)) ?? items[0];
  expect(pick?.slug, "catalog needs at least one product").toBeTruthy();
  return pick!.slug;
}

export async function addStockViaApi(
  page: Page,
  productSlug: string,
  quantity: number,
) {
  const res = await page.request.patch("/api/admin/inventory", {
    data: {
      productSlug,
      operation: "add",
      quantity,
      note: "E2E stock add",
    },
  });
  expect(res.ok()).toBeTruthy();
}

export async function placeOrderViaApi(
  page: Page,
  clientId: string,
  clientEmail: string,
  productSlug: string,
) {
  const res = await page.request.post("/api/orders", {
    data: {
      clientId,
      clientEmail,
      dispatchAddress: "Bhuj, Gujarat 370001",
      note: "E2E wholesale order",
      items: [
        {
          slug: productSlug,
          color: "Red",
          sizes: ["S", "M", "L", "XL"],
          setQuantity: 1,
        },
      ],
    },
  });
  const orderText = await res.text();
  expect(res.ok(), `order failed: ${orderText}`).toBeTruthy();
  const data = JSON.parse(orderText) as {
    order: { id: string; status: string };
  };
  return data.order as { id: string; status: string };
}

export async function updateOrderStatusUI(
  page: Page,
  orderId: string,
  status: string,
) {
  await page.goto("/admin/orders");
  await demoPause(page);
  const row = page.locator("tr, .sarjan-order-row, [data-order-id]").filter({
    hasText: orderId,
  });
  await row.first().click();
  await demoPause(page);
  const statusSelect = page
    .locator("select")
    .filter({ hasText: /pending|approved|dispatch/i })
    .first();
  if (await statusSelect.isVisible().catch(() => false)) {
    await statusSelect.selectOption({ label: status });
  } else {
    await page
      .getByLabel(/status/i)
      .selectOption({ label: status })
      .catch(() =>
        page.locator("select").first().selectOption({ label: status }),
      );
  }
  await page
    .getByRole("button", { name: /save|update/i })
    .first()
    .click();
  await demoPause(page);
}

export async function updateOrderStatusViaApi(
  page: Page,
  orderId: string,
  status: string,
) {
  const res = await page.request.patch("/api/admin/orders", {
    data: { id: orderId, status },
  });
  expect(res.ok()).toBeTruthy();
}

export async function getClientIdByEmail(
  page: Page,
  email: string,
): Promise<string> {
  const res = await page.request.get("/api/admin/customers");
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  const customer = (data.customers as { id: string; email: string }[]).find(
    (c) => c.email.toLowerCase() === email.toLowerCase(),
  );
  expect(customer, `customer ${email} not found`).toBeTruthy();
  return customer!.id;
}
