/**
 * Ensure categoryMaster + category hub subcategories match all product categories.
 *
 *   npx tsx --env-file=.env.local scripts/sync-categories-from-products.ts
 */
import { getCmsSnapshotForPatch, saveCmsSnapshot } from "../src/lib/cms-store";
import { asStoredProducts } from "../src/lib/cms-admin-view";
import { syncCategoriesFromProducts } from "../src/lib/cms-category-sync";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const CMS_PATH = path.join(process.cwd(), "data", "cms-db.json");

async function main() {
  const cms = await getCmsSnapshotForPatch();
  const products = asStoredProducts(cms.products ?? []);
  const before = (cms.categoryMaster ?? []).length;

  const { categoryMaster, categoryHubPages, categoryNames } =
    syncCategoriesFromProducts({
      products,
      categoryMaster: cms.categoryMaster ?? [],
      categoryHubPages: cms.categoryHubPages ?? [],
    });

  const next = await saveCmsSnapshot(
    { categoryMaster, categoryHubPages },
    cms,
    { light: true },
  );
  await mkdir(path.dirname(CMS_PATH), { recursive: true });
  await writeFile(CMS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  console.log(`Synced ${categoryNames.length} product categories.`);
  console.log(
    `categoryMaster: ${before} → ${categoryMaster.length} (${categoryMaster.length - before} added)`,
  );
  for (const name of categoryNames) {
    console.log(`  • ${name}`);
  }
  console.log("\nPush to live:");
  console.log("  node scripts/sync-cms.mjs push-categories");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
