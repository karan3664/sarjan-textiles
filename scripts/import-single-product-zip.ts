/**
 * Import one CMS product from a zip of photos (no CSV).
 *
 *   npx tsx --env-file=.env.local scripts/import-single-product-zip.ts \
 *     --zip "/path/photos.zip" \
 *     --name "Ladies Clutch — Assorted Designs Delivered" \
 *     --category "Women's Clutch" \
 *     --sku-prefix STWCLT \
 *     --price 70 --moq 10
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { Product } from "../src/data/mock";
import {
  getCmsSnapshotForPatch,
  saveCmsSnapshot,
  upsertCmsProducts,
} from "../src/lib/cms-store";
import { asStoredProducts } from "../src/lib/cms-admin-view";
import { localizeProductsOnSaveFast } from "../src/lib/product-localize";
import { resolveCmsUploadsRoot } from "../src/lib/cms-uploads-path";
import {
  buildSetStockFieldsFromBulk,
  buildVariantsFromBulkRow,
  filterActiveSizes,
} from "../src/lib/bulk-product-stock";
import {
  categoryNamesFromProducts,
  ensureCategoryMasterEntries,
  ensureCategoryHubSubcategories,
  firstProductImageByCategory,
} from "../src/lib/cms-category-sync";

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function nextSku(prefix: string, existing: string[]): string {
  const upperPrefix = prefix.toUpperCase();
  let next = 1;
  for (const sku of existing) {
    const match = String(sku)
      .toUpperCase()
      .match(new RegExp(`^${upperPrefix}(\\d+)$`));
    if (match) next = Math.max(next, Number(match[1]) + 1);
  }
  return `${upperPrefix}${String(next).padStart(2, "0")}`;
}

async function uploadImageToCms(sourceFile: string): Promise<string> {
  const uploadDir = resolveCmsUploadsRoot();
  await mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${randomUUID()}.webp`;
  const dest = path.join(uploadDir, filename);
  const input = await fs.promises.readFile(sourceFile);
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .webp({ quality: 76, effort: 4 })
    .toBuffer();
  await writeFile(dest, buffer);
  return `/uploads/cms/${filename}`;
}

function listZipImages(extractDir: string): string[] {
  const entries = fs.readdirSync(extractDir, { recursive: true }) as string[];
  return entries
    .filter((entry) => /\.(jpe?g|png|webp)$/i.test(entry))
    .map((entry) => path.join(extractDir, entry))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function main() {
  const zipPath = argValue("--zip");
  const name = argValue("--name")?.trim();
  const category = argValue("--category")?.trim() || "Women's wear";
  const skuPrefix = (argValue("--sku-prefix") ?? "STPRD").toUpperCase();
  const price = Number(argValue("--price") ?? "0");
  const moq = Number(argValue("--moq") ?? "1");
  const sizes = filterActiveSizes(
    (argValue("--sizes") ?? "Free Size")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const colors = (argValue("--colors") ?? "Assorted")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!zipPath || !name) {
    throw new Error(
      "Usage: import-single-product-zip.ts --zip <path> --name <title> [--category] [--sku-prefix] [--price] [--moq] [--sizes] [--colors]",
    );
  }
  if (!fs.existsSync(zipPath)) throw new Error(`Zip not found: ${zipPath}`);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("--price must be a positive number");
  }

  const extractDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "cms-single-import-"),
  );
  execSync(
    `unzip -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(extractDir)}`,
  );
  const files = listZipImages(extractDir);
  if (!files.length) throw new Error("No images found in zip");

  console.log(`Uploading ${files.length} photos…`);
  const images: string[] = [];
  for (const file of files) {
    images.push(await uploadImageToCms(file));
  }

  const cms = await getCmsSnapshotForPatch();
  const sku = nextSku(
    skuPrefix,
    (cms.products ?? []).map((product) => String(product.sku ?? "")),
  );

  const variants = buildVariantsFromBulkRow({
    colors,
    sizes,
    sku,
    price,
    stockRegularSets: 0,
    stockPlusSets: 0,
    totalStock: 0,
    defaultSetStock: 0,
    variantStockText: "",
  });
  const setStockFields = buildSetStockFieldsFromBulk({
    colors,
    sizes,
    stockRegularSets: 0,
    stockPlusSets: 0,
    totalStock: 0,
  });

  const product: Product = {
    id: `PRD-${sku}`,
    slug: slugify(name),
    name,
    sku,
    category,
    categoryPath: [category],
    categoryLevel1: category,
    fabric: argValue("--fabric")?.trim() || "",
    price,
    moq,
    stock: setStockFields.stock,
    colors,
    sizes,
    stockRegularSets: setStockFields.stockRegularSets,
    stockPlusSets: setStockFields.stockPlusSets,
    variants: variants.length ? variants : undefined,
    images,
    description: argValue("--description")?.trim() || "",
    metaTitle: name,
    isFeatured: false,
  };

  const existingBySku = new Map(
    (cms.products ?? []).map((item) => [
      String(item.sku ?? "").toUpperCase(),
      item,
    ]),
  );
  const existing = existingBySku.get(sku.toUpperCase());
  const merged = existing
    ? { ...product, id: existing.id, slug: existing.slug }
    : product;

  const stored = asStoredProducts(localizeProductsOnSaveFast([merged]));
  await upsertCmsProducts(stored, cms);

  const allProducts = asStoredProducts([
    ...(cms.products ?? []).filter(
      (item) => String(item.sku ?? "").toUpperCase() !== sku.toUpperCase(),
    ),
    ...stored,
  ]);
  const categoryNames = categoryNamesFromProducts(allProducts);
  const refreshed = await getCmsSnapshotForPatch();
  const categoryMaster = ensureCategoryMasterEntries(
    refreshed.categoryMaster ?? [],
    categoryNames,
  );
  const categoryHubPages = ensureCategoryHubSubcategories(
    refreshed.categoryHubPages ?? [],
    categoryNames,
    { productImageByCategory: firstProductImageByCategory(allProducts) },
  );
  await saveCmsSnapshot({ categoryMaster, categoryHubPages }, refreshed, {
    light: true,
  });
  await writeFile(
    path.join(process.cwd(), "data", "cms-db.json"),
    `${JSON.stringify(
      {
        ...(await getCmsSnapshotForPatch()),
        products: allProducts,
        categoryMaster,
        categoryHubPages,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`\nImported: ${name}`);
  console.log(`  SKU: ${sku}`);
  console.log(`  Category: ${category}`);
  console.log(`  Price: ₹${price} | MOQ: ${moq}`);
  console.log(`  Photos: ${images.length}`);
  console.log("\nPush live:");
  console.log(
    `  node scripts/sync-cms.mjs push-new-products --sku-prefix ${skuPrefix}`,
  );
  console.log(`  node scripts/push-uploads-http.mjs --sku-prefix ${skuPrefix}`);
  console.log("  node scripts/sync-cms.mjs push-categories");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
