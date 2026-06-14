import { readFile, writeFile } from "fs/promises";
import path from "path";
import {
  enrichCategoryFilterGroup,
  productDepartment,
} from "../src/lib/product-category-filter";
import type { Product } from "../src/data/mock";
import type { CmsProductFilterGroup } from "../src/lib/cms-store";

async function apply() {
  const cmsPath = path.join(process.cwd(), "data", "cms-db.json");
  const cms = JSON.parse(await readFile(cmsPath, "utf8")) as {
    products: Product[];
    productFilters: CmsProductFilterGroup[];
    updatedAt?: string;
  };

  const products = cms.products ?? [];
  const filters = cms.productFilters ?? [];
  const categoryIndex = filters.findIndex((group) => group.type === "category");
  if (categoryIndex < 0) {
    console.error("No category filter group found");
    process.exit(1);
  }

  const enriched = enrichCategoryFilterGroup(
    filters[categoryIndex]!,
    products,
    "en",
  );
  filters[categoryIndex] = enriched;
  cms.productFilters = filters;
  cms.updatedAt = new Date().toISOString();

  await writeFile(cmsPath, `${JSON.stringify(cms, null, 2)}\n`, "utf8");

  const men = products.filter((p) => productDepartment(p) === "men").length;
  const women = products.filter((p) => productDepartment(p) === "women").length;

  console.log("Updated category filter options:");
  for (const opt of enriched.options) {
    const label = typeof opt.label === "string" ? opt.label : opt.label?.en;
    console.log(`  - ${label}`);
  }
  console.log(`Men products: ${men}, Women products: ${women}`);
}

if (process.argv.includes("--apply")) {
  apply().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  console.log(
    "Run with --apply to sync Men/Women category filters in cms-db.json",
  );
}
