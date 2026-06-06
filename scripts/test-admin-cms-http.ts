/**
 * HTTP integration test for all admin CMS save endpoints.
 * Run while dev server is up:
 *   ADMIN_TEST_TOKEN=1 ADMIN_SESSION_SECRET=... npx tsx scripts/test-admin-cms-http.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { createAdminToken } from "../src/lib/admin-token";

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("="))
        continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();

const BASE = process.env.ADMIN_TEST_BASE ?? "http://localhost:3010";

async function login(): Promise<string> {
  return createAdminToken({
    email: "admin@sarjantextiles.com",
    name: "Test Admin",
    role: "super_admin",
    iat: Date.now(),
  });
}

async function cmsGet(token: string) {
  const res = await fetch(`${BASE}/api/admin/cms`, {
    headers: { Cookie: `sarjan-admin-session=${encodeURIComponent(token)}` },
  });
  if (!res.ok) throw new Error(`GET cms failed (${res.status})`);
  return res.json();
}

async function cmsPut(token: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/admin/cms`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: `sarjan-admin-session=${encodeURIComponent(token)}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  const token = await login();
  console.log("Logged in.\n");

  const cms = await cmsGet(token);
  const stamp = Date.now();
  const failures: string[] = [];

  const cases: Array<{
    name: string;
    body: Record<string, unknown>;
    expectKeys: string[];
  }> = [
    {
      name: "home",
      body: {
        home: {
          ...cms.home,
          hero: { ...cms.home.hero, title: `HTTP home ${stamp}` },
        },
      },
      expectKeys: ["home"],
    },
    {
      name: "siteSettings",
      body: {
        siteSettings: {
          ...cms.siteSettings,
          footerNote: `HTTP footer ${stamp}`,
        },
      },
      expectKeys: ["siteSettings"],
    },
    {
      name: "pages.about",
      body: {
        pages: {
          ...cms.pages,
          about: { ...cms.pages.about, title: `HTTP about ${stamp}` },
        },
      },
      expectKeys: ["pages"],
    },
    {
      name: "seoPages",
      body: {
        seoPages: cms.seoPages.map((p: { id: string }, i: number) =>
          i === 0 ? { ...p, metaTitle: `HTTP seo ${stamp}` } : p,
        ),
      },
      expectKeys: ["seoPages"],
    },
    {
      name: "categoryHubPages",
      body: { categoryHubPages: cms.categoryHubPages },
      expectKeys: ["categoryHubPages"],
    },
    {
      name: "collectionPages",
      body: { collectionPages: cms.collectionPages },
      expectKeys: ["collectionPages"],
    },
    {
      name: "productFilters",
      body: { productFilters: cms.productFilters },
      expectKeys: ["productFilters"],
    },
    {
      name: "customSitePages",
      body: { customSitePages: cms.customSitePages ?? [] },
      expectKeys: ["customSitePages"],
    },
    {
      name: "mobileApp",
      body: {
        mobileApp: {
          ...cms.mobileApp,
          splash: { ...cms.mobileApp.splash, tagline: `HTTP mobile ${stamp}` },
        },
      },
      expectKeys: ["mobileApp"],
    },
  ];

  for (const testCase of cases) {
    const { ok, status, data } = await cmsPut(token, testCase.body);
    if (!ok) {
      failures.push(
        `${testCase.name}: HTTP ${status} — ${(data as { error?: string }).error ?? "unknown"}`,
      );
      console.log(`FAIL ${testCase.name} (${status})`);
      continue;
    }

    const missing = testCase.expectKeys.filter(
      (key) => (data as Record<string, unknown>)[key] === undefined,
    );
    if (missing.length) {
      failures.push(`${testCase.name}: response missing ${missing.join(", ")}`);
      console.log(
        `FAIL ${testCase.name} (missing keys: ${missing.join(", ")})`,
      );
      continue;
    }

    // Verify persistence via GET
    const reloaded = await cmsGet(token);
    const bodyKey = Object.keys(testCase.body)[0]!;
    const savedVal = (reloaded as Record<string, unknown>)[bodyKey];
    if (savedVal === undefined) {
      failures.push(`${testCase.name}: GET after save missing ${bodyKey}`);
      console.log(`FAIL ${testCase.name} (not persisted)`);
      continue;
    }

    console.log(`OK   ${testCase.name}`);
  }

  // Restore original CMS (best effort)
  await cmsPut(token, {
    home: cms.home,
    siteSettings: cms.siteSettings,
    pages: cms.pages,
    seoPages: cms.seoPages,
    categoryHubPages: cms.categoryHubPages,
    collectionPages: cms.collectionPages,
    productFilters: cms.productFilters,
    customSitePages: cms.customSitePages ?? [],
    mobileApp: cms.mobileApp,
  });
  console.log("\nRestored snapshot.");

  if (failures.length) {
    console.error("\nFailures:");
    failures.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  }
  console.log("\nAll HTTP CMS save checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
