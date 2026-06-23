import "server-only";

import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import type { Product } from "@/data/mock";
import {
  extractSheetCellText,
  splitSheetImageUrls,
  splitSheetList,
} from "@/lib/bulk-sheet-cell";
import { PRODUCT_PLACEHOLDER_IMAGE } from "@/lib/product-placeholder-image";
import {
  buildSetStockFieldsFromBulk,
  buildVariantsFromBulkRow,
  filterActiveSizes,
} from "@/lib/bulk-product-stock";

export type SheetRow = Record<
  string,
  string | number | boolean | null | undefined
>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitList(value: unknown) {
  return splitSheetList(value);
}

export function stringValue(row: SheetRow, key: string) {
  return extractSheetCellText(row[key]);
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

function hasCell(row: SheetRow, key: string) {
  return stringValue(row, key) !== "";
}

function hasNumericCell(row: SheetRow, key: string) {
  if (!hasCell(row, key)) return false;
  const value = Number(String(row[key] ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(value);
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
  return filterActiveSizes(mergeSizeLists(sizesRegular, sizesPlus, sizesAll));
}

export function productFromSheetRow(row: SheetRow, index: number): Product {
  const name = stringValue(row, "name");
  const sku = stringValue(row, "sku");
  const imageList = splitSheetImageUrls(row.image_urls ?? row.images);
  const imageUrls =
    imageList.length > 0 ? imageList : splitList(row.image_urls ?? row.images);
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
  const variants = buildVariantsFromBulkRow({
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
  const setStockFields = buildSetStockFieldsFromBulk({
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
    price: numberValue(row, "price"),
    moq: numberValue(row, "moq", 1),
    stock: setStockFields.stock,
    reserved: numberValue(row, "reserved"),
    sold: numberValue(row, "sold"),
    colors,
    sizes,
    stockRegularSets: setStockFields.stockRegularSets,
    stockPlusSets: setStockFields.stockPlusSets,
    variants: variants.length ? variants : undefined,
    images: imageUrls.length ? imageUrls : [PRODUCT_PLACEHOLDER_IMAGE],
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

export function isValidSheetProduct(product: Product) {
  return Boolean(product.name && product.sku && product.slug);
}

/** Merge sheet row into an existing product — empty cells keep current values. */
export function mergeSheetRowIntoProduct(
  existing: Product,
  row: SheetRow,
): Product {
  const colors = splitList(stringValue(row, "colors"));
  const sizes = productSizesFromRow(row);
  const mergedColors = colors.length ? colors : existing.colors;
  const mergedSizes = sizes.length ? sizes : existing.sizes;
  const price = hasNumericCell(row, "price")
    ? numberValue(row, "price")
    : existing.price;
  const stockRegularSets = hasNumericCell(row, "stock_regular")
    ? numberValue(row, "stock_regular")
    : (existing.stockRegularSets ?? 0);
  const stockPlusSets = hasNumericCell(row, "stock_plus")
    ? numberValue(row, "stock_plus")
    : (existing.stockPlusSets ?? 0);
  const setStockFields = buildSetStockFieldsFromBulk({
    colors: mergedColors,
    sizes: mergedSizes,
    stockRegularSets,
    stockPlusSets,
    totalStock: hasNumericCell(row, "stock")
      ? numberValue(row, "stock")
      : existing.stock,
  });
  const variants = buildVariantsFromBulkRow({
    colors: mergedColors,
    sizes: mergedSizes,
    sku: hasCell(row, "sku") ? stringValue(row, "sku") : existing.sku,
    price,
    totalStock: setStockFields.stock,
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

  const categoryPath = [
    hasCell(row, "category_level_1")
      ? stringValue(row, "category_level_1")
      : existing.categoryLevel1,
    hasCell(row, "category_level_2")
      ? stringValue(row, "category_level_2")
      : existing.categoryLevel2,
    hasCell(row, "category_level_3")
      ? stringValue(row, "category_level_3")
      : existing.categoryLevel3,
  ].filter(Boolean) as string[];

  const imageList = splitSheetImageUrls(row.image_urls ?? row.images);
  const imageUrls =
    imageList.length > 0 ? imageList : splitList(row.image_urls ?? row.images);

  return {
    ...existing,
    id: existing.id,
    slug: existing.slug,
    name: hasCell(row, "name") ? stringValue(row, "name") : existing.name,
    sku: hasCell(row, "sku") ? stringValue(row, "sku") : existing.sku,
    category: hasCell(row, "category")
      ? stringValue(row, "category")
      : existing.category,
    categoryPath: categoryPath.length
      ? categoryPath
      : (existing.categoryPath ?? [existing.category]),
    categoryLevel1: categoryPath[0] ?? existing.categoryLevel1,
    categoryLevel2: categoryPath[1] ?? existing.categoryLevel2,
    categoryLevel3: categoryPath[2] ?? existing.categoryLevel3,
    fabric: hasCell(row, "fabric")
      ? stringValue(row, "fabric")
      : existing.fabric,
    price,
    moq: hasNumericCell(row, "moq") ? numberValue(row, "moq", 1) : existing.moq,
    stock: setStockFields.stock,
    reserved: hasNumericCell(row, "reserved")
      ? numberValue(row, "reserved")
      : existing.reserved,
    sold: hasNumericCell(row, "sold")
      ? numberValue(row, "sold")
      : existing.sold,
    colors: mergedColors,
    sizes: mergedSizes,
    stockRegularSets: setStockFields.stockRegularSets,
    stockPlusSets: setStockFields.stockPlusSets,
    variants: variants.length ? variants : existing.variants,
    images: imageUrls.length ? imageUrls : existing.images,
    imageAlt: hasCell(row, "image_alt")
      ? stringValue(row, "image_alt")
      : existing.imageAlt,
    description: hasCell(row, "description")
      ? stringValue(row, "description")
      : existing.description,
    care: hasCell(row, "care") ? stringValue(row, "care") : existing.care,
    metaTitle: hasCell(row, "meta_title")
      ? stringValue(row, "meta_title")
      : existing.metaTitle,
    metaDescription: hasCell(row, "meta_description")
      ? stringValue(row, "meta_description")
      : existing.metaDescription,
    keywords: hasCell(row, "keywords")
      ? stringValue(row, "keywords")
      : existing.keywords,
    isFeatured: hasCell(row, "is_featured")
      ? boolValue(row.is_featured)
      : existing.isFeatured,
  };
}

export function matchSheetRowToProduct(
  row: SheetRow,
  bySlug: Map<string, Product>,
  byId: Map<string, Product>,
): Product | null {
  const slug = stringValue(row, "slug");
  const id = stringValue(row, "id");
  if (slug && bySlug.has(slug)) return bySlug.get(slug) ?? null;
  if (id && byId.has(id)) return byId.get(id) ?? null;
  return null;
}

async function sheetRowsFromWorkbook(
  workbook: ExcelJS.Workbook,
): Promise<SheetRow[]> {
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers: string[] = [];
  const rows: SheetRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = extractSheetCellText(cell.value)
          .trim()
          .toLowerCase();
      });
      return;
    }
    const record: SheetRow = {};
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber];
      if (key) record[key] = extractSheetCellText(cell.value);
    });
    if (
      stringValue(record, "slug") ||
      stringValue(record, "id") ||
      stringValue(record, "name") ||
      stringValue(record, "sku")
    ) {
      rows.push(record);
    }
  });
  return rows;
}

export async function parseProductSheetBuffer(
  buffer: Buffer,
  extension: "xlsx" | "csv",
): Promise<SheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  if (extension === "csv") {
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.read(Readable.from(buffer));
  }
  return sheetRowsFromWorkbook(workbook);
}
