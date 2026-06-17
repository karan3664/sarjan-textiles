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
  buildVariantsFromBulkRow,
  buildSetStockFieldsFromBulk,
  filterActiveSizes,
} from "@/lib/bulk-product-stock";
import { requireAdminRouteSession } from "@/lib/require-admin-session";

const maxBulkBytes = 10 * 1024 * 1024;

export const runtime = "nodejs";
export const maxDuration = 60;

type SheetRow = Record<string, string | number | boolean | null | undefined>;

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

function stringValue(row: SheetRow, key: string) {
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

function productFromRow(row: SheetRow, index: number): Product {
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

function validProduct(product: Product) {
  return Boolean(product.name && product.sku && product.slug);
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
        headers[colNumber] = extractSheetCellText(cell.value);
      });
      return;
    }
    const record: SheetRow = {};
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber];
      if (key) record[key] = extractSheetCellText(cell.value);
    });
    if (stringValue(record, "name") || stringValue(record, "sku")) {
      rows.push(record);
    }
  });
  return rows;
}

async function parseCsvRows(buffer: Buffer): Promise<SheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.csv.read(Readable.from(buffer));
  return sheetRowsFromWorkbook(workbook);
}

async function parseWorkbookRows(buffer: Buffer): Promise<SheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.read(Readable.from(buffer));
  return sheetRowsFromWorkbook(workbook);
}

export async function POST(request: Request) {
  const session = await requireAdminRouteSession(request, {
    path: "/api/admin/cms",
  });
  if (session instanceof Response) return session;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Excel file required" }, { status: 400 });
  }
  if (file.size > maxBulkBytes) {
    return Response.json(
      { error: "Spreadsheet must be under 10 MB" },
      { status: 400 },
    );
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["xlsx", "csv"].includes(extension)) {
    return Response.json(
      { error: "Only xlsx or csv files allowed" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows =
    extension === "csv"
      ? await parseCsvRows(buffer)
      : await parseWorkbookRows(buffer);
  if (!rows.length) {
    return Response.json({ error: "No worksheet rows found" }, { status: 400 });
  }
  const parsedProducts = rows.map(productFromRow);
  const products = parsedProducts.filter(validProduct);
  const invalidRows = parsedProducts.length - products.length;

  if (!products.length) {
    return Response.json(
      { error: "No valid products found. Name and SKU are required." },
      { status: 400 },
    );
  }

  return Response.json({ products, invalidRows, totalRows: rows.length });
}
