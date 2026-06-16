/**
 * Import Women's Kaftan shirts: CSV rows + zip photos → AI Product Studio → CMS.
 *
 * Zip photos are grouped by leading number (1..N) matching CSV row order.
 * Within each product, images map to colors in CSV order (Indigo, Maroon, …).
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/import-kaftan-shirts-ai-studio.ts \
 *     "/path/Product upload sheet - Women's Kaftan Shirts.csv" \
 *     "/path/Modal Kaftan Shirt.zip"
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
  saveCmsSnapshot,
  upsertCmsProducts,
  type CategoryHubPage,
  type ProductCategoryMaster,
} from "../src/lib/cms-store";
import { asStoredProducts } from "../src/lib/cms-admin-view";
import { localizeProductsOnSaveFast } from "../src/lib/product-localize";
import { PRODUCT_PLACEHOLDER_IMAGE } from "../src/lib/product-placeholder-image";
import { slugifyCmsSegment } from "../src/lib/slug";
import { readEnglish } from "../src/lib/cms-localize";
import {
  buildSetStockFieldsFromBulk,
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
  const merged = mergeSizeLists(sizesRegular, sizesPlus);
  const freeSizeOnly =
    merged.length === 1 && /^free\s*size$/i.test(merged[0] ?? "");
  if (freeSizeOnly) return ["Free Size"];
  return filterActiveSizes(merged);
}

function isFreeSizeRow(row: SheetRow) {
  const sizesRegular = splitList(stringValue(row, "sizes_regular"));
  return (
    sizesRegular.length === 1 && /^free\s*size$/i.test(sizesRegular[0] ?? "")
  );
}

function parseImageFileName(name: string) {
  const base = name.replace(/\.[^.]+$/i, "");
  const grouped = base.match(/^(\d+)\s*\((\d+)\)$/);
  if (grouped)
    return { product: Number(grouped[1]), index: Number(grouped[2]) };
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
    sourceFile: imageFiles[index] ?? imageFiles[imageFiles.length - 1] ?? "",
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
    "womens-wear",
    "kaftan-shirts",
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
    note: `Kaftan batch import — ${sku} ${color}`,
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
  const category = stringValue(row, "category") || "Women's wear";
  const colors = splitList(stringValue(row, "colors"));
  const sizes = productSizesFromRow(row);
  const price = numberValue(row, "price");
  const stockRegularSets = numberValue(row, "stock_regular");
  const stockPlusSets = numberValue(row, "stock_plus");
  const freeSizeOnly = isFreeSizeRow(row);
  const variantColors = colors.length ? colors : ["Assorted"];

  const variants = freeSizeOnly
    ? variantColors.map((color) => ({
        sku: `${sku}-${color.slice(0, 3).toUpperCase()}-FS`.replace(/\s+/g, ""),
        color,
        size: "Free Size",
        price,
        stock: stockRegularSets,
      }))
    : [];

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
        variantStockText: stringValue(row, "variant_stock"),
      });

  const imageList =
    images.filter(Boolean).length > 0
      ? images.filter(Boolean)
      : colors.map(() => PRODUCT_PLACEHOLDER_IMAGE);

  return {
    id: `PRD-KFT-${sku}`,
    slug: slugify(name || sku || `product-${index + 1}`),
    name,
    sku,
    category,
    categoryPath: [category],
    categoryLevel1: category,
    fabric: stringValue(row, "fabric") || "Modal",
    price,
    moq: numberValue(row, "moq", 1),
    stock: setStockFields.stock,
    colors: variantColors,
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
  const csvPath = process.argv[2];
  const zipPath = process.argv[3];
  if (!csvPath || !zipPath) {
    throw new Error(
      "Usage: npx tsx scripts/import-kaftan-shirts-ai-studio.ts <csv> <zip>",
    );
  }
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);
  if (!fs.existsSync(zipPath)) throw new Error(`Zip not found: ${zipPath}`);

  const rows = await parseCsvFile(csvPath);
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "kaftan-shirts-"));
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
    const colors = splitList(stringValue(row, "colors"));
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

  console.log(`Staging ${jobs.length} color images to AI studio raw…`);
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
    const colors = splitList(stringValue(row, "colors"));
    const urls: string[] = [];
    for (const color of colors) {
      const url = await approveBySkuColor(sku, color);
      urls.push(url ?? PRODUCT_PLACEHOLDER_IMAGE);
    }
    imageUrlsBySku.set(sku, urls);
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
  let nextCms = await upsertCmsProducts(stored, cms);

  const categoryMaster = ensureCategoryMaster(nextCms.categoryMaster ?? [], [
    "Women's wear",
  ]);
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

  for (const product of stored) {
    const imgs = (product.images as string[]) ?? [];
    console.log(
      `  ✓ ${product.sku} — ${readEnglish(product.name as string)} (${imgs.length} color images)`,
    );
  }

  console.log("\nDone. Color swatches map images[colorIndex] on PDP.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
