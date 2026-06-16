/**
 * Import Cotton Printed Shirts: CSV rows + zip photos → AI Product Studio → CMS.
 *
 * Zip groups 1..N match CSV row order (`1 (1)`, `3.jpeg`, etc.).
 * Empty colors column defaults to Assorted (first image per product).
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/import-cotton-printed-shirts-ai-studio.ts \
 *     "/path/Product upload sheet - Cotton Printed Shirt.csv" \
 *     "/path/Cotton Printed Shirts.zip"
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import type { Product } from "../src/data/mock";
import {
  getCmsSnapshotForPatch,
  saveCategoryMaster,
  upsertCmsProducts,
  type ProductCategoryMaster,
} from "../src/lib/cms-store";
import { asStoredProducts } from "../src/lib/cms-admin-view";
import { localizeProductsOnSaveFast } from "../src/lib/product-localize";
import { PRODUCT_PLACEHOLDER_IMAGE } from "../src/lib/product-placeholder-image";
import { alignZipImagesToCsvColors } from "../src/lib/product-colors";
import { slugifyCmsSegment } from "../src/lib/slug";
import { readEnglish } from "../src/lib/cms-localize";
import {
  buildSetStockFieldsFromBulk,
  buildVariantsFromBulkRow,
  filterActiveSizes,
} from "../src/lib/bulk-product-stock";
import {
  metadataFromParts,
  processStudioImages,
  productStudioPrompt,
  resolveAiStudioProductsRoot,
  scanRawFolder,
  updateStudioPrompt,
  updateStudioRecord,
} from "../src/lib/ai-product-studio";

const STUDIO_CATEGORY = "mens-shirt";
const STUDIO_COLLECTION = "cotton-printed-shirts";

const STUDIO_PROMPT = `Use the provided product image as the ONLY reference. Task: Create a highly realistic eCommerce product image with natural depth and shadows. STRICT RULES (MANDATORY): - Do NOT change print, color, pattern, fabric, or texture. See the print in detail. - Do NOT modify buttons, collar, stitching, label, pocket, sleeve shape, hem, proportions, or any detail. - Maintain exact proportions and all visible details from the reference product. - Product should look exact same as real, like clicked by camera professionally Photoshoot setup: - Product laid flat, top-down view. - Perfect alignment. - Add realistic soft contact shadow beneath product. - Add subtle directional shadow. - Natural depth with gradient shadow. - Do a little adjustment of Brightness and exposure, contrast and Saturation but it should look realistic - Reduce the extra wrinkles Background: - Clean white or light neutral #fafafa. Lighting: - Soft studio lighting. - Slight directional lighting. - Natural shadow falloff. - Realistic highlights on folds. Realism enhancements: - Fabric depth visibility. - Natural texture visibility. - Slight wrinkles allowed only if product shape, pattern, and proportions remain exact. Style: - Zara style. - Premium fashion ecommerce. Output: - 4K resolution. - Website-ready. - Photorealistic. - Ultra realistic. - No text. - No watermark.

Make sure no change in color, button, logo, design, pattern.`;

type SheetRow = Record<string, string | number | boolean | null | undefined>;

type ColorImageJob = {
  sku: string;
  productName: string;
  color: string;
  colorIndex: number;
  sourceFile: string;
  rawRelativePath: string;
};

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

function colorsForRow(row: SheetRow) {
  const colors = splitList(stringValue(row, "colors"));
  return colors.length ? colors : ["Assorted"];
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
  const sizesRegular = splitList(stringValue(row, "sizes_regular"));
  const sizesPlus = splitList(stringValue(row, "sizes_plus"));
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

function mapImagesToColors(imageFiles: string[], colors: string[]) {
  return colors.map((color, index) => ({
    color,
    colorIndex: index,
    sourceFile: imageFiles[index] ?? imageFiles[0] ?? "",
  }));
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
    if (stringValue(record, "name") || stringValue(record, "sku")) {
      rows.push(record);
    }
  });
  return rows;
}

function studioRawPath(sku: string, color: string) {
  const metadata = metadataFromParts(
    STUDIO_CATEGORY,
    STUDIO_COLLECTION,
    sku.toLowerCase(),
    color.toLowerCase(),
  );
  return path.join(
    "raw",
    metadata.category,
    metadata.collection,
    metadata.attributeType,
    metadata.attributeValue,
  );
}

async function stageRawImages(jobs: ColorImageJob[]) {
  const root = resolveAiStudioProductsRoot();
  for (const job of jobs) {
    const dir = path.join(root, job.rawRelativePath);
    await mkdir(dir, { recursive: true });
    const ext = path.extname(job.sourceFile).toLowerCase() || ".jpeg";
    const dest = path.join(dir, `${slugify(job.color)}-${randomUUID()}${ext}`);
    await copyFile(job.sourceFile, dest);
    job.rawRelativePath = path.relative(root, dest).split(path.sep).join("/");
  }
}

async function processAllQueued(batchSize = 8) {
  let remaining = 1;
  while (remaining > 0) {
    const result = await processStudioImages(undefined, batchSize);
    remaining = result.remaining;
    console.log(
      `  processed batch: ${result.processed.length}, remaining: ${remaining}`,
    );
    if (result.processed.length === 0 && remaining > 0) {
      throw new Error("Processing stalled with remaining queued images");
    }
  }
}

async function approveBySkuColor(
  sku: string,
  color: string,
): Promise<string | null> {
  const { getStudioSnapshot } = await import("../src/lib/ai-product-studio");
  const snapshot = await getStudioSnapshot();
  const record = snapshot.records.find(
    (item) =>
      item.status === "processed" &&
      item.metadata.attributeType === sku.toLowerCase() &&
      item.metadata.attributeValue === color.toLowerCase(),
  );
  if (!record) return null;
  const approved = await updateStudioRecord({
    id: record.id,
    action: "approve",
    sku,
    note: `Cotton printed shirt batch import — ${sku} ${color}`,
  });
  return approved.finalPublicUrl ?? null;
}

function productFromRow(
  row: SheetRow,
  index: number,
  images: string[],
): Product {
  const name = stringValue(row, "name");
  const sku = stringValue(row, "sku");
  const category = stringValue(row, "category") || "Men's Shirt";
  const colors = colorsForRow(row);
  const sizes = productSizesFromRow(row);
  const price = numberValue(row, "price");
  const stockRegularSets = numberValue(row, "stock_regular");
  const stockPlusSets = numberValue(row, "stock_plus");
  const variants = buildVariantsFromBulkRow({
    colors: splitList(stringValue(row, "colors")),
    sizes,
    sku,
    price,
    stockRegularSets,
    stockPlusSets,
    variantStockText: stringValue(row, "variant_stock"),
  });
  const setStockFields = buildSetStockFieldsFromBulk({
    colors: splitList(stringValue(row, "colors")),
    sizes,
    stockRegularSets,
    stockPlusSets,
  });

  const imageList =
    images.filter(Boolean).length > 0
      ? images.filter(Boolean)
      : colors.map(() => PRODUCT_PLACEHOLDER_IMAGE);

  return {
    id: `PRD-PRT-${sku}`,
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
    images: imageList,
    description: stringValue(row, "description"),
    care: stringValue(row, "care"),
    metaTitle: name,
    isFeatured: boolValue(row.is_featured),
  };
}

function ensureCategoryMaster(
  existing: ProductCategoryMaster[],
  names: string[],
): ProductCategoryMaster[] {
  const byName = new Map(existing.map((item) => [item.name, item]));
  const now = new Date().toISOString();
  for (const name of names) {
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

async function main() {
  const csvPath = process.argv[2];
  const zipPath = process.argv[3];
  if (!csvPath || !zipPath) {
    throw new Error(
      "Usage: npx tsx scripts/import-cotton-printed-shirts-ai-studio.ts <csv> <zip>",
    );
  }
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);
  if (!fs.existsSync(zipPath)) throw new Error(`Zip not found: ${zipPath}`);

  const rows = await parseCsvFile(csvPath);
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "cotton-shirts-"));
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
  console.log(
    `Catalog mode: ${process.env.AI_IMAGE_CATALOG_MODE || "preserve"}`,
  );

  await updateStudioPrompt(STUDIO_PROMPT.trim() || productStudioPrompt);

  const jobs: ColorImageJob[] = [];
  rows.forEach((row, index) => {
    const sku = stringValue(row, "sku");
    const name = stringValue(row, "name");
    const colors = colorsForRow(row);
    const mappings = mapImagesToColors(imageGroups[index] ?? [], colors);
    for (const mapping of mappings) {
      if (!mapping.sourceFile) continue;
      jobs.push({
        sku,
        productName: name,
        color: mapping.color,
        colorIndex: mapping.colorIndex,
        sourceFile: mapping.sourceFile,
        rawRelativePath: studioRawPath(sku, mapping.color),
      });
    }
  });

  console.log(`Staging ${jobs.length} images to AI studio raw…`);
  await stageRawImages(jobs);

  const scan = await scanRawFolder();
  console.log(
    `Scan added ${scan.added.length} studio records (skipped ${scan.skipped.length})`,
  );

  console.log("Processing images through AI Product Studio…");
  await processAllQueued(6);

  console.log("Approving processed images…");
  const imageUrlsBySku = new Map<string, string[]>();
  for (const row of rows) {
    const sku = stringValue(row, "sku");
    const colors = colorsForRow(row);
    const urls: string[] = [];
    for (const color of colors) {
      const url = await approveBySkuColor(sku, color);
      urls.push(url ?? PRODUCT_PLACEHOLDER_IMAGE);
    }
    imageUrlsBySku.set(sku, alignZipImagesToCsvColors(urls));
    console.log(
      `  ${sku}: ${urls.filter((u) => !u.includes("placeholder")).length}/${colors.length} images`,
    );
  }

  const products = rows.map((row, index) => {
    const sku = stringValue(row, "sku");
    return productFromRow(row, index, imageUrlsBySku.get(sku) ?? []);
  });

  console.log(`\nImporting ${products.length} products to CMS…`);
  const cms = await getCmsSnapshotForPatch();
  const stored = asStoredProducts(localizeProductsOnSaveFast(products));
  await upsertCmsProducts(stored, cms);

  const categoryMaster = ensureCategoryMaster(cms.categoryMaster ?? [], [
    "Men's Shirt",
  ]);
  await saveCategoryMaster(categoryMaster);

  for (const product of stored) {
    const imgs = (product.images as string[]) ?? [];
    console.log(
      `  ✓ ${product.sku} — ${readEnglish(product.name as string)} (${imgs.length} images)`,
    );
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
