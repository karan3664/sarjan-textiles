import { test, expect } from "@playwright/test";
import { recordFinding, flushAuditReport } from "./audit-log";
import {
  adminEmail,
  adminPassword,
  dismissCookieBanner,
  loginAdmin,
} from "./helpers";

function pass(
  area: "Backend API" | "Frontend Web" | "Flow" | "Integration",
  category: string,
  check: string,
  detail: string,
) {
  recordFinding({ area, category, check, status: "PASS", detail });
}

function fail(
  area: "Backend API" | "Frontend Web" | "Flow" | "Integration",
  category: string,
  check: string,
  detail: string,
) {
  recordFinding({ area, category, check, status: "FAIL", detail });
}

function warn(
  area: "Backend API" | "Frontend Web" | "Flow" | "Integration",
  category: string,
  check: string,
  detail: string,
) {
  recordFinding({ area, category, check, status: "WARN", detail });
}

async function checkUrl(
  request: import("@playwright/test").APIRequestContext,
  area: "Backend API" | "Frontend Web",
  category: string,
  check: string,
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
) {
  try {
    const response =
      method === "GET"
        ? await request.get(path)
        : await request.post(path, { data: body });
    if (response.ok()) {
      pass(area, category, check, `${response.status()} ${path}`);
    } else {
      fail(area, category, check, `${response.status()} ${path}`);
    }
    return response;
  } catch (error) {
    fail(area, category, check, String(error));
    return null;
  }
}

test.describe("Backend audit", () => {
  test("API endpoints & integrations", async ({ request }) => {
    await checkUrl(request, "Backend API", "Core", "Health", "/api/health");
    await checkUrl(
      request,
      "Backend API",
      "Core",
      "Homepage API",
      "/api/homepage",
    );
    await checkUrl(
      request,
      "Backend API",
      "Catalog",
      "Categories",
      "/api/categories",
    );
    await checkUrl(
      request,
      "Backend API",
      "Catalog",
      "Inventory",
      "/api/inventory",
    );
    await checkUrl(
      request,
      "Backend API",
      "Catalog",
      "Products",
      "/api/catalog/products",
    );
    await checkUrl(
      request,
      "Backend API",
      "Catalog",
      "Navigation",
      "/api/navigation",
    );
    const session = await request.get("/api/auth/session");
    if (session.status() === 401) {
      pass(
        "Backend API",
        "Auth",
        "Session (guest)",
        "401 — unauthenticated as expected",
      );
      pass("Backend API", "Auth", "Guest session rejected", "401 as expected");
    } else if (session.ok()) {
      pass(
        "Backend API",
        "Auth",
        "Session (guest)",
        `${session.status()} — session active`,
      );
    } else {
      warn(
        "Backend API",
        "Auth",
        "Session (guest)",
        `Unexpected ${session.status()}`,
      );
    }

    const adminLogin = await request.post("/api/admin/auth/login", {
      data: { email: adminEmail, password: adminPassword },
    });
    if (adminLogin.ok()) {
      pass("Backend API", "Auth", "Admin login API", "200 + token");
    } else {
      fail("Backend API", "Auth", "Admin login API", `${adminLogin.status()}`);
    }

    const gstCaptcha = await request.get("/api/gst/captcha");
    if (gstCaptcha.ok()) {
      const ct = gstCaptcha.headers()["content-type"] ?? "";
      if (ct.includes("image") || ct.includes("json")) {
        pass(
          "Backend API",
          "GST",
          "Captcha endpoint",
          `${gstCaptcha.status()} ${ct}`,
        );
      } else {
        warn(
          "Backend API",
          "GST",
          "Captcha endpoint",
          `200 but content-type: ${ct}`,
        );
      }
    } else {
      fail("Backend API", "GST", "Captcha endpoint", `${gstCaptcha.status()}`);
    }

    const gstVerify = await request.post("/api/gst/verify", {
      data: { gst: "24AABCU9603R1ZM" },
    });
    if (
      gstVerify.status() === 200 ||
      gstVerify.status() === 400 ||
      gstVerify.status() === 502
    ) {
      const body = await gstVerify.json().catch(() => ({}));
      const msg = body?.gst?.error ?? body?.error ?? gstVerify.status();
      if (gstVerify.ok()) {
        pass("Backend API", "GST", "Verify endpoint", String(msg).slice(0, 80));
      } else if (gstVerify.status() === 502) {
        warn(
          "Backend API",
          "GST",
          "Verify endpoint",
          "Portal unreachable (502) — expected offline",
        );
      } else {
        warn("Backend API", "GST", "Verify endpoint", String(msg).slice(0, 80));
      }
    } else {
      fail("Backend API", "GST", "Verify endpoint", `${gstVerify.status()}`);
    }

    const otpSend = await request.post("/api/auth/send-otp", {
      data: { email: "e2e-test@example.com", purpose: "login" },
    });
    if (otpSend.ok() || otpSend.status() === 429) {
      pass("Backend API", "Mail/OTP", "Send OTP route", `${otpSend.status()}`);
    } else if (otpSend.status() === 503) {
      warn(
        "Backend API",
        "Mail/OTP",
        "Send OTP route",
        "503 — SMTP not configured (local OK)",
      );
    } else {
      fail("Backend API", "Mail/OTP", "Send OTP route", `${otpSend.status()}`);
    }

    if (adminLogin.ok()) {
      const token = (await adminLogin.json()).token as string;
      const system = await request.get("/api/admin/system", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (system.ok()) {
        const sys = await system.json();
        if (sys.smtpReady) {
          pass(
            "Backend API",
            "Mail/SMTP",
            "SMTP configured",
            "All SMTP env vars set",
          );
        } else {
          warn(
            "Backend API",
            "Mail/SMTP",
            "SMTP configured",
            `Missing: ${(sys.smtpMissing as string[]).join(", ") || "unknown"}`,
          );
        }
        pass(
          "Backend API",
          "Database",
          "Mode",
          String(sys.databaseMode ?? "unknown"),
        );
      } else {
        fail("Backend API", "Admin", "System status", `${system.status()}`);
      }
    }

    await checkUrl(
      request,
      "Backend API",
      "Mobile",
      "Mobile config",
      "/api/mobile/config",
    );
    await checkUrl(request, "Backend API", "Content", "Blogs", "/api/blogs");
    await checkUrl(
      request,
      "Backend API",
      "Content",
      "Testimonials",
      "/api/testimonials",
    );
  });
});

test.describe("Frontend audit", () => {
  test("pages, CSS, fonts, images", async ({ page, request }) => {
    const pages = [
      { path: "/", name: "Homepage" },
      { path: "/products", name: "Products" },
      { path: "/login", name: "Login" },
      { path: "/contact", name: "Contact" },
      { path: "/register", name: "Register" },
    ];

    for (const { path, name } of pages) {
      try {
        const response = await page.goto(path, {
          waitUntil: "domcontentloaded",
        });
        if (response && response.ok()) {
          pass("Frontend Web", "Pages", name, `${response.status()} ${path}`);
        } else {
          fail(
            "Frontend Web",
            "Pages",
            name,
            `${response?.status() ?? "no response"} ${path}`,
          );
        }
      } catch (error) {
        fail("Frontend Web", "Pages", name, String(error));
      }
    }

    await page.goto("/");
    await dismissCookieBanner(page);

    const cssLinks = await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLLinkElement).href).filter(Boolean),
      );
    for (const href of cssLinks.slice(0, 12)) {
      try {
        const res = await request.get(href);
        const file = href.split("/").pop() ?? href;
        if (res.ok()) {
          pass("Frontend Web", "CSS", file, `${res.status()}`);
        } else {
          fail("Frontend Web", "CSS", file, `${res.status()} — ${href}`);
        }
      } catch (error) {
        fail("Frontend Web", "CSS", href, String(error));
      }
    }

    const fonts = await page.evaluate(() => {
      const body = getComputedStyle(document.body).fontFamily;
      const h1 = document.querySelector("h1, .heading");
      const heading = h1 ? getComputedStyle(h1).fontFamily : body;
      return { body, heading };
    });
    pass("Frontend Web", "Fonts", "Body font-family", fonts.body.slice(0, 60));
    pass(
      "Frontend Web",
      "Fonts",
      "Heading font-family",
      fonts.heading.slice(0, 60),
    );

    const fontRequests: string[] = [];
    page.on("response", (res) => {
      const url = res.url();
      if (/\.(woff2?|ttf|otf)(\?|$)/i.test(url)) fontRequests.push(url);
    });
    await page.reload({ waitUntil: "networkidle" });
    await dismissCookieBanner(page);
    if (fontRequests.length > 0) {
      pass(
        "Frontend Web",
        "Fonts",
        "Font files loaded",
        `${fontRequests.length} file(s)`,
      );
    } else {
      warn(
        "Frontend Web",
        "Fonts",
        "Font files loaded",
        "No .woff/.woff2 requests (system fonts?)",
      );
    }

    const imageAudit = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll("img")].slice(0, 40);
      const broken: string[] = [];
      const ok: string[] = [];
      const skippedCdn: string[] = [];
      for (const img of imgs) {
        const src = img.currentSrc || img.src;
        if (!src || src.startsWith("data:")) continue;
        if (/fbcdn\.net|instagram\.com|cdninstagram/i.test(src)) {
          skippedCdn.push(src);
          continue;
        }
        if (!img.complete || img.naturalWidth === 0) broken.push(src);
        else ok.push(src);
      }
      return {
        broken,
        ok: ok.length,
        total: imgs.length,
        skippedCdn: skippedCdn.length,
      };
    });

    if (imageAudit.broken.length === 0) {
      pass(
        "Frontend Web",
        "Images",
        "Homepage images",
        `${imageAudit.ok}/${imageAudit.total} loaded OK${imageAudit.skippedCdn ? ` (${imageAudit.skippedCdn} CDN skipped)` : ""}`,
      );
    } else {
      fail(
        "Frontend Web",
        "Images",
        "Homepage broken images",
        imageAudit.broken.slice(0, 3).join(" | "),
      );
    }

    const logo = page
      .locator('img[alt*="Sarjan"], .sarjan-logo, header img')
      .first();
    if (await logo.isVisible().catch(() => false)) {
      const logoOk = await logo.evaluate(
        (el) =>
          (el as HTMLImageElement).complete &&
          (el as HTMLImageElement).naturalWidth > 0,
      );
      if (logoOk) pass("Frontend Web", "Images", "Header logo", "Loaded");
      else
        fail("Frontend Web", "Images", "Header logo", "Broken or zero width");
    } else {
      warn("Frontend Web", "Images", "Header logo", "Logo element not found");
    }
  });
});

test.describe("Flow audit", () => {
  test("storefront → admin → CMS journey", async ({ page, request }) => {
    try {
      await page.goto("/");
      await dismissCookieBanner(page);
      pass("Flow", "Storefront", "Homepage load", page.url());

      const products = await page.goto("/products");
      if (products?.ok()) pass("Flow", "Storefront", "Products browse", "OK");
      else
        fail("Flow", "Storefront", "Products browse", `${products?.status()}`);

      await loginAdmin(page);
      pass("Flow", "Admin", "Login → dashboard", page.url());

      await page.goto("/admin/cms");
      const cmsText = await page.locator("body").innerText();
      if (/cms|content|home|page/i.test(cmsText)) {
        pass("Flow", "Admin", "CMS access", "/admin/cms");
      } else {
        fail(
          "Flow",
          "Admin",
          "CMS access",
          "Page loaded but CMS UI not detected",
        );
      }

      const health = await request.get("/api/health");
      if (health.ok())
        pass("Flow", "Integration", "API during session", "Health OK");
      else
        fail("Flow", "Integration", "API during session", `${health.status()}`);
    } catch (error) {
      fail("Flow", "Integration", "Full journey", String(error));
    }
  });

  test("client registration page GST field", async ({ page }) => {
    await page.goto("/register");
    await dismissCookieBanner(page);
    await page
      .locator('input[name="gst"]')
      .waitFor({ state: "visible", timeout: 20_000 })
      .catch(() => null);
    const gstField = page.locator('input[name="gst"]').first();
    if (await gstField.isVisible().catch(() => false)) {
      pass("Flow", "GST UI", "Register GST field", "Visible on /register");
    } else {
      warn(
        "Flow",
        "GST UI",
        "Register GST field",
        "GST input not found on register page",
      );
    }
  });
});

test.afterAll(() => {
  flushAuditReport();
});
