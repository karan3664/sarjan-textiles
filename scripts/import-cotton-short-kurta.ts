/**
 * Import Men's Cotton Short Kurtas: CSV + zip → CMS uploads + photo-detected colors.
 *
 * Zip groups 1..N match CSV row order (`1 (1).webp`, `3.webp`, etc.).
 * One color label per image — detected from pixels, not the sheet colors column.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/import-cotton-short-kurta.ts \
 *     "/path/sheet.csv" "/path/photos.zip" [SKU_PREFIX] [category name]
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
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
import { readEnglish } from "../src/lib/cms-localize";
import {
  buildSetStockFieldsFromBulk,
  buildVariantsFromBulkRow,
  filterActiveSizes,
} from "../src/lib/bulk-product-stock";
import {
  averageGarmentRgb,
  nearestGarmentColorLabel,
} from "../src/lib/garment-color-from-image";
import {
  categoryNamesFromProducts,
  ensureCategoryMasterEntries,
  firstProductImageByCategory,
  ensureCategoryHubSubcategories,
} from "../src/lib/cms-category-sync";

const DEFAULT_SKU_PREFIX = "STSKPRCT";

type SheetRow = Record<string, string | number | boolean | null | undefined>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stringValue(row: SheetRow, key: string) {
  return String(row[key] ?? "").trim();
}

function numberValue(row: SheetRow, key: string, fallback = 0) {
  const value = Number(String(row[key] ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown) {
  return ["true", "yes", "1", "featured"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

function mergeSizeLists(...lists: string[][]) {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const list of lists) {
    for (const size of list) {
      const trimmed = size.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      merged.push(trimmed);
    }
  }
  return merged;
}

function productSizesFromRow(row: SheetRow) {
  const sizesRegular = stringValue(row, "sizes_regular")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const sizesPlus = stringValue(row, "sizes_plus")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return filterActiveSizes(mergeSizeLists(sizesRegular, sizesPlus));
}

function parseImageFileName(name: string) {
  const base = name.replace(/\.[^.]+$/i, "").trim();
  const grouped = base.match(/^(\d+)\s*E?\s*\((\d+)\)$/i);
  if (grouped) {
    return { product: Number(grouped[1]), index: Number(grouped[2]) };
  }
  const singleE = base.match(/^(\d+)\s*E$/i);
  if (singleE) return { product: Number(singleE[1]), index: 1 };
  const single = base.match(/^(\d+)$/);
  if (single) return { product: Number(single[1]), index: 1 };
  return { product: 9999, index: 9999 };
}

function listZipImageGroups(extractDir: string): string[][] {
  const entries = fs.readdirSync(extractDir, { recursive: true }) as string[];
  const files = entries
    .filter((entry) => /\.(jpe?g|png|webp)$/i.test(entry))
    .map((entry) => path.join(extractDir, entry));

  const byProduct = new Map<number, Array<{ index: number; file: string }>>();
  for (const file of files) {
    const parsed = parseImageFileName(path.basename(file));
    const bucket = byProduct.get(parsed.product) ?? [];
    bucket.push({ index: parsed.index, file });
    byProduct.set(parsed.product, bucket);
  }

  return [...byProduct.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, items]) =>
      items.sort((a, b) => a.index - b.index).map((item) => item.file),
    );
}

async function parseCsvFile(filePath: string): Promise<SheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.csv.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`No worksheet in ${filePath}`);

  const headers: string[] = [];
  const rows: SheetRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value ?? "").trim();
      });
      return;
    }
    const record: SheetRow = {};
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber];
      if (key) record[key] = cell.value as SheetRow[string];
    });
    if (stringValue(record, "name")) rows.push(record);
  });
  return rows;
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

async function detectColorsForFiles(files: string[]): Promise<string[]> {
  const labels: string[] = [];
  for (const file of files) {
    try {
      const rgb = await averageGarmentRgb(file, sharp);
      labels.push(nearestGarmentColorLabel(rgb));
    } catch {
      labels.push("Default");
    }
  }
  return labels;
}

function assignSkus(rows: SheetRow[], skuPrefix: string): string[] {
  let nextIndex = 1;
  const used = new Set<string>();
  const prefix = skuPrefix.toUpperCase();
  for (const row of rows) {
    const sku = stringValue(row, "sku").toUpperCase();
    if (sku) used.add(sku);
  }
  for (const sku of used) {
    const match = sku.match(new RegExp(`^${prefix}(\\d+)$`, "i"));
    if (match) nextIndex = Math.max(nextIndex, Number(match[1]) + 1);
  }

  return rows.map((row) => {
    const existing = stringValue(row, "sku").toUpperCase();
    if (existing) return existing;
    while (used.has(`${prefix}${String(nextIndex).padStart(2, "0")}`)) {
      nextIndex += 1;
    }
    const sku = `${prefix}${String(nextIndex).padStart(2, "0")}`;
    nextIndex += 1;
    used.add(sku);
    return sku;
  });
}

function uniqueColorsForVariants(colors: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const color of colors) {
    const key = color.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(color);
  }
  return unique.length ? unique : ["Default"];
}

function productFromImport(
  row: SheetRow,
  index: number,
  sku: string,
  images: string[],
  colors: string[],
): Product {
  const name = stringValue(row, "name");
  const category = stringValue(row, "category") || "Men's Kurta";
  const sizes = productSizesFromRow(row);
  const price = numberValue(row, "price");
  const stockRegularSets = numberValue(row, "stock_regular");
  const stockPlusSets = numberValue(row, "stock_plus");
  const variantColors = uniqueColorsForVariants(colors);

  const variants = buildVariantsFromBulkRow({
    colors: variantColors,
    sizes,
    sku,
    price,
    stockRegularSets,
    stockPlusSets,
    totalStock: 0,
    defaultSetStock: 0,
    variantStockText: stringValue(row, "variant_stock"),
  });
  const setStockFields = buildSetStockFieldsFromBulk({
    colors: variantColors,
    sizes,
    stockRegularSets,
    stockPlusSets,
    totalStock: 0,
  });

  return {
    id: `PRD-KRT-${sku}`,
    slug: slugify(name || sku || `product-${index + 1}`),
    name,
    sku,
    category,
    categoryPath: [category],
    categoryLevel1: category,
    fabric: stringValue(row, "fabric") || "Cotton",
    price,
    moq: numberValue(row, "moq", 1),
    stock: setStockFields.stock,
    colors,
    sizes,
    stockRegularSets: setStockFields.stockRegularSets,
    stockPlusSets: setStockFields.stockPlusSets,
    variants: variants.length ? variants : undefined,
    images,
    description: stringValue(row, "description"),
    care: stringValue(row, "care"),
    metaTitle: name,
    isFeatured: boolValue(row.is_featured),
  };
}

async function main() {
  const csvPath = process.argv[2];
  const zipPath = process.argv[3];
  const skuPrefix = (process.argv[4] ?? DEFAULT_SKU_PREFIX).toUpperCase();
  const categoryFallback = process.argv[5] ?? "Men's Kurta";
  if (!csvPath || !zipPath) {
    throw new Error(
      "Usage: npx tsx scripts/import-cotton-short-kurta.ts <csv> <zip> [SKU_PREFIX] [category]",
    );
  }
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);
  if (!fs.existsSync(zipPath)) throw new Error(`Zip not found: ${zipPath}`);

  const rows = await parseCsvFile(csvPath);
  const skus = assignSkus(rows, skuPrefix);
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-zip-import-"));
  execSync(
    `unzip -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(extractDir)}`,
  );
  const imageGroups = listZipImageGroups(extractDir);

  if (imageGroups.length !== rows.length) {
    throw new Error(
      `CSV has ${rows.length} products but zip has ${imageGroups.length} image groups`,
    );
  }

  console.log(`CSV rows: ${rows.length}`);
  console.log(`Image groups: ${imageGroups.length}`);

  const stagedUrls: string[][] = [];
  const stagedColors: string[][] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const files = imageGroups[index] ?? [];
    const urls: string[] = [];
    for (const file of files) {
      urls.push(await uploadImageToCms(file));
    }
    const colors = await detectColorsForFiles(files);
    stagedUrls.push(urls);
    stagedColors.push(colors);
    console.log(
      `  ${skus[index]} — ${stringValue(rows[index], "name").slice(0, 42)}: ${colors.join(", ")} (${urls.length} photos)`,
    );
  }

  const products = rows.map((row, index) =>
    productFromImport(
      row,
      index,
      skus[index],
      stagedUrls[index],
      stagedColors[index],
    ),
  );

  console.log(`\nImporting ${products.length} products to CMS…`);
  const cms = await getCmsSnapshotForPatch();
  const existingBySku = new Map(
    (cms.products ?? []).map((product) => [
      String(product.sku ?? "").toUpperCase(),
      product,
    ]),
  );
  const merged = products.map((product) => {
    const existing = existingBySku.get(product.sku.toUpperCase());
    if (!existing) return product;
    return { ...product, id: existing.id, slug: existing.slug };
  });

  const stored = asStoredProducts(localizeProductsOnSaveFast(merged));
  await upsertCmsProducts(stored, cms);

  const allProducts = asStoredProducts([
    ...(cms.products ?? []).filter(
      (product) =>
        !stored.some(
          (item) =>
            String(item.sku ?? "").toUpperCase() ===
            String(product.sku ?? "").toUpperCase(),
        ),
    ),
    ...stored,
  ]);
  const categoryNames = categoryNamesFromProducts(allProducts);
  const refreshed = await getCmsSnapshotForPatch();
  const categoryMaster = ensureCategoryMasterEntries(
    refreshed.categoryMaster ?? [],
    categoryNames.length ? categoryNames : [categoryFallback],
  );
  const categoryHubPages = ensureCategoryHubSubcategories(
    refreshed.categoryHubPages ?? [],
    categoryNames,
    { productImageByCategory: firstProductImageByCategory(allProducts) },
  );
  await saveCmsSnapshot({ categoryMaster, categoryHubPages }, refreshed, {
    light: true,
  });

  for (const product of stored) {
    console.log(
      `  ✓ ${product.sku} — ${readEnglish(product.name as string)} (${(product.images as string[])?.length ?? 0} images)`,
    );
  }

  console.log("\nDone. Push to live:");
  console.log(
    `  node scripts/sync-cms.mjs push-new-products --sku-prefix ${skuPrefix}`,
  );
  console.log(`  node scripts/push-uploads-http.mjs --sku-prefix ${skuPrefix}`);
  console.log("  node scripts/sync-cms.mjs push-categories");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  if (error instanceof Error) console.error(error.stack);
  process.exit(1);
});
