/**
 * Simulates admin home CMS PUT — localizes, syncs mobile extras, builds response.
 * Run: npx tsx --env-file=.env.local scripts/test-home-cms-save.ts
 */
import { getCmsSnapshot } from "../src/lib/cms-store";
import {
  localizeHomeOnSave,
  resolveHomeForLocale,
} from "../src/lib/content-localize";
import { syncMobileAppExtrasFromHome } from "../src/lib/mobile-app-cms";
import { adminCmsPutResponse, asStoredHome } from "../src/lib/cms-admin-view";

async function main() {
  console.log("Loading CMS snapshot…");
  const before = await getCmsSnapshot();
  const adminHome = resolveHomeForLocale(before.home, "en");
  console.log("Hero title:", adminHome.hero?.title);

  const mergedHome = { ...before.home, ...adminHome };

  console.log("\n1) localizeHomeOnSave…");
  const t0 = Date.now();
  const localized = await localizeHomeOnSave(mergedHome, before.home);
  console.log("   OK in", Date.now() - t0, "ms");

  const storedHome = asStoredHome(localized);

  console.log("\n2) syncMobileAppExtrasFromHome…");
  const t1 = Date.now();
  const mobileApp = syncMobileAppExtrasFromHome(
    before.mobileApp,
    before.siteSettings,
    storedHome,
  );
  console.log("   OK in", Date.now() - t1, "ms");

  console.log("\n3) adminCmsPutResponse…");
  const body = { home: storedHome, mobileApp };
  const next = { ...before, ...body, updatedAt: new Date().toISOString() };
  const response = adminCmsPutResponse(next, Object.keys(body));
  if (!response.home) {
    throw new Error("Response missing home");
  }
  console.log("   Response keys:", Object.keys(response).join(", "));
  console.log("\n✅ Home CMS save pipeline passed.");
}

main().catch((error) => {
  console.error("\n❌ FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
