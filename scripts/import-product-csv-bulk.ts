/**
 * Import products from one or more CSV bulk-upload sheets into CMS.
 * Run:
 *   npx tsx --env-file=.env.local scripts/import-product-csv-bulk.ts "/path/a.csv" "/path/b.csv"
 */
import * as fs from "node:fs";
import ExcelJS from "exceljs";
import type { Product } from "../src/data/mock";
import {
  getCmsSnapshotForPatch,
  saveCategoryMaster,
  saveCmsSnapshot,
  upsertCmsProducts,
  type CategoryHubPage,
  type ProductCategoryMaster,
} from "../src/lib/cms-store";
import { asStoredProducts } from "../src/lib/cms-admin-view";
import { localizeProductsOnSaveFast } from "../src/lib/product-localize";
import { PRODUCT_PLACEHOLDER_IMAGE } from "../src/lib/product-placeholder-image";
import {
  buildSetStockFieldsFromBulk,
  buildVariantsFromBulkRow,
  filterActiveSizes,
} from "../src/lib/bulk-product-stock";
import { slugifyCmsSegment } from "../src/lib/slug";
import { readEnglish } from "../src/lib/cms-localize";

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
  const sizesRegular = splitList(
    firstStringValue(row, ["sizes_regular", "sizes_xs_xxl", "sizes_xs_to_xxl"]),
  );
  const sizesPlus = splitList(
    firstStringValue(row, ["sizes_plus", "sizes_3xl_5xl", "sizes_3xl_to_5xl"]),
  );
  const sizesAll = splitList(stringValue(row, "sizes"));
  const merged = mergeSizeLists(sizesRegular, sizesPlus, sizesAll);
  const freeSizeOnly =
    merged.length === 1 && /^free\s*size$/i.test(merged[0] ?? "");
  if (freeSizeOnly) return ["Free Size"];
  return filterActiveSizes(merged);
}

function isFreeSizeRow(row: SheetRow) {
  const sizesRegular = splitList(
    firstStringValue(row, ["sizes_regular", "sizes_xs_xxl", "sizes_xs_to_xxl"]),
  );
  return (
    sizesRegular.length === 1 && /^free\s*size$/i.test(sizesRegular[0] ?? "")
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
  const colors = splitList(stringValue(row, "colors"));
  const sizes = productSizesFromRow(row);
  const price = numberValue(row, "price");
  const stockRegularSets =
    numberValue(row, "stock_regular") || numberValue(row, "stock_xs_xxl");
  const stockPlusSets =
    numberValue(row, "stock_plus") || numberValue(row, "stock_3xl_5xl");
  const freeSizeOnly = isFreeSizeRow(row);
  const variantColors = colors.length ? colors : ["Assorted"];
  const variants = freeSizeOnly
    ? variantColors.map((color) => ({
        sku: `${stringValue(row, "sku")}-${color.slice(0, 3).toUpperCase()}-FS`.replace(
          /\s+/g,
          "",
        ),
        color,
        size: "Free Size",
        price,
        stock: stockRegularSets,
      }))
    : buildVariantsFromBulkRow({
        colors,
        sizes,
        sku: stringValue(row, "sku"),
        price,
        totalStock: numberValue(row, "stock"),
        defaultSetStock:
          numberValue(row, "variant_stock_default") ||
          numberValue(row, "variant_stock_per_piece") ||
          numberValue(row, "variantStock"),
        stockRegularSets,
        stockPlusSets,
        variantStockText: firstStringValue(row, [
          "variant_stock",
          "variant_stocks",
        ]),
      });
  const setStockFields = freeSizeOnly
    ? {
        stock: stockRegularSets * variantColors.length,
        stockRegularSets,
        stockPlusSets: 0,
      }
    : buildSetStockFieldsFromBulk({
        colors,
        sizes,
        stockRegularSets,
        stockPlusSets,
        totalStock: numberValue(row, "stock"),
      });

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
    price,
    moq: numberValue(row, "moq", 1),
    stock: setStockFields.stock,
    reserved: numberValue(row, "reserved"),
    sold: numberValue(row, "sold"),
    colors,
    sizes,
    stockRegularSets: setStockFields.stockRegularSets,
    stockPlusSets: setStockFields.stockPlusSets,
    variants: variants.length ? variants : undefined,
    images: splitList(imageUrls).length
      ? splitList(imageUrls)
      : [PRODUCT_PLACEHOLDER_IMAGE],
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

async function parseCsvFile(filePath: string): Promise<SheetRow[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
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
    rows.push(record);
  });
  return rows;
}

const REQUIRED_CATEGORIES: Array<{ name: string; path: string[] }> = [
  { name: "Men's Shirt", path: ["Men's Shirt"] },
  { name: "Men's Kurta", path: ["Men's Kurta"] },
  { name: "Women's wear", path: ["Women's wear"] },
];

function ensureCategoryMaster(
  existing: ProductCategoryMaster[],
  productCategories: string[],
): ProductCategoryMaster[] {
  const byName = new Map(existing.map((item) => [item.name, item]));
  const now = new Date().toISOString();

  for (const category of REQUIRED_CATEGORIES) {
    if (!byName.has(category.name)) {
      byName.set(category.name, {
        id: slugifyCmsSegment(category.name),
        name: category.name,
        path: category.path,
        active: true,
        updatedAt: now,
      });
    }
  }

  for (const name of productCategories) {
    if (!name || byName.has(name)) continue;
    byName.set(name, {
      id: slugifyCmsSegment(name),
      name,
      path: [name],
      active: true,
      updatedAt: now,
    });
  }

  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function ensureWomenCategoryHub(hubs: CategoryHubPage[]): CategoryHubPage[] {
  const hasWomen = hubs.some((hub) => {
    const title = readEnglish(hub.title as string).toLowerCase();
    return hub.slug === "womens-wear" || title.includes("women");
  });
  if (hasWomen) return hubs;

  return [
    ...hubs,
    {
      id: "hub-womens-wear",
      slug: "womens-wear",
      title: "Women's Wear",
      subtitle:
        "Contemporary womenswear — kaftan shirts and fusion silhouettes",
      heroImage: "/sarjan-assets/banner-textiles-studio.webp",
      intro:
        "Wholesale women's lines from Sarjan Textiles. Browse kaftan shirts and curated womenswear.",
      enabled: true,
      updatedAt: new Date().toISOString(),
      subcategories: [
        {
          id: "sub-kaftan-shirts",
          title: "Kaftan Shirts",
          description: "Modal Ajrakh kaftan shirts in free size.",
          image: "/sarjan-assets/shirt-ajrak-black-studio.webp",
          href: "/products?category=womens-wear",
        },
      ],
    },
  ];
}

async function main() {
  const filePaths = process.argv.slice(2);
  if (!filePaths.length) {
    throw new Error(
      "Usage: npx tsx scripts/import-product-csv-bulk.ts <file1.csv> [file2.csv ...]",
    );
  }

  const allRows: SheetRow[] = [];
  for (const filePath of filePaths) {
    const rows = await parseCsvFile(filePath);
    console.log(`• ${filePath}: ${rows.length} rows`);
    allRows.push(...rows);
  }

  const parsed = allRows.map(productFromRow);
  const products = parsed.filter((product) => product.name && product.sku);
  if (!products.length) {
    throw new Error("No valid products (name + sku required)");
  }

  console.log(`\nImporting ${products.length} products…`);
  const cms = await getCmsSnapshotForPatch();
  const stored = asStoredProducts(localizeProductsOnSaveFast(products));
  const t0 = Date.now();
  let nextCms = await upsertCmsProducts(stored, cms);

  const categoryNames = [
    ...new Set(
      stored
        .map((product) => readEnglish(product.category as string))
        .filter(Boolean),
    ),
  ];
  const categoryMaster = ensureCategoryMaster(
    nextCms.categoryMaster ?? [],
    categoryNames,
  );
  await saveCategoryMaster(categoryMaster);
  nextCms = await getCmsSnapshotForPatch();

  const categoryHubPages = ensureWomenCategoryHub(
    nextCms.categoryHubPages ?? [],
  );
  if (categoryHubPages.length !== (nextCms.categoryHubPages ?? []).length) {
    nextCms = await saveCmsSnapshot({ categoryHubPages }, nextCms, {
      light: true,
    });
    console.log("Added Women's Wear category hub page");
  }

  console.log(`Done in ${Date.now() - t0}ms`);
  console.log(`Categories in master: ${categoryMaster.length}`);
  for (const product of stored) {
    console.log(
      `  ✓ ${product.sku} — ${readEnglish(product.name as string)} (${readEnglish(product.category as string)})`,
    );
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
  } else {
    console.error(error);
  }
  process.exit(1);
});
