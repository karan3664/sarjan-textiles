/**
 * Import products from Excel into CMS (local file or Postgres).
 * Run: npx tsx --env-file=.env.local scripts/import-products-xlsx.ts "/path/to/file.xlsx"
 */
import * as XLSX from "xlsx";
import type { Product } from "../src/data/mock";
import {
  getCmsSnapshotForPatch,
  upsertCmsProducts,
} from "../src/lib/cms-store";
import { asStoredProducts } from "../src/lib/cms-admin-view";
import { localizeProductsOnSaveFast } from "../src/lib/product-localize";

type SheetRow = Record<string, string | number | boolean | null | undefined>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringValue(row: SheetRow, key: string) {
  return String(row[key] ?? "").trim();
}

function firstStringValue(row: SheetRow, keys: string[]) {
  return keys.map((key) => stringValue(row, key)).find(Boolean) ?? "";
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

function productFromRow(row: SheetRow, index: number): Product {
  const name = stringValue(row, "name");
  const sku = stringValue(row, "sku");
  const imageUrls =
    stringValue(row, "image_urls") || stringValue(row, "images");
  const categoryPath = [
    firstStringValue(row, [
      "category_level_1",
      "category_l1",
      "parent_category",
    ]),
    firstStringValue(row, ["category_level_2", "category_l2", "subcategory"]),
    firstStringValue(row, [
      "category_level_3",
      "category_l3",
      "child_category",
    ]),
  ].filter(Boolean);
  const category =
    stringValue(row, "category") || categoryPath.at(-1) || "Uncategorized";
  const explicitPath = splitList(
    firstStringValue(row, ["category_path", "categories"]),
  );
  const finalCategoryPath = explicitPath.length ? explicitPath : categoryPath;

  return {
    id:
      stringValue(row, "id") ||
      `PRD-${Date.now().toString().slice(-6)}-${String(index + 1).padStart(2, "0")}`,
    slug:
      stringValue(row, "slug") ||
      slugify(name || sku || `product-${index + 1}`),
    name,
    sku,
    category,
    categoryPath: finalCategoryPath.length ? finalCategoryPath : [category],
    categoryLevel1: finalCategoryPath[0] || category,
    categoryLevel2: finalCategoryPath[1],
    categoryLevel3: finalCategoryPath[2],
    fabric: stringValue(row, "fabric") || "Cotton",
    price: numberValue(row, "price"),
    moq: numberValue(row, "moq", 1),
    stock: numberValue(row, "stock"),
    reserved: numberValue(row, "reserved"),
    sold: numberValue(row, "sold"),
    colors: splitList(stringValue(row, "colors")),
    sizes: splitList(stringValue(row, "sizes")),
    images: splitList(imageUrls).length
      ? splitList(imageUrls)
      : ["/sarjan-assets/sarjan-logo.svg"],
    imageAlt: firstStringValue(row, ["image_alt", "alt_text", "alt"]),
    description: stringValue(row, "description"),
    care: stringValue(row, "care"),
    metaTitle:
      firstStringValue(row, ["meta_title", "seo_title", "title_tag"]) || name,
    metaDescription: firstStringValue(row, [
      "meta_description",
      "seo_description",
      "description_tag",
    ]),
    keywords: firstStringValue(row, [
      "keywords",
      "meta_keywords",
      "seo_keywords",
    ]),
    isFeatured: boolValue(row.is_featured ?? row.featured),
  };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error(
      "Usage: npx tsx scripts/import-products-xlsx.ts <file.xlsx>",
    );
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No worksheet found");

  const rows = XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName]!, {
    defval: "",
  });
  const parsed = rows.map(productFromRow);
  const products = parsed.filter((product) => product.name && product.sku);
  if (!products.length) throw new Error("No valid rows (name + sku required)");

  console.log(`Importing ${products.length} products from ${sheetName}…`);
  const cms = await getCmsSnapshotForPatch();
  const stored = asStoredProducts(localizeProductsOnSaveFast(products));
  const t0 = Date.now();
  await upsertCmsProducts(stored, cms);
  console.log(`Done in ${Date.now() - t0}ms`);
  for (const product of stored) {
    console.log(`  • ${product.sku} — ${product.slug}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
