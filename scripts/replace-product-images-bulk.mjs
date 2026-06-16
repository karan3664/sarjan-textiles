#!/usr/bin/env node
/**
 * Replace product images from CSV + zip — no AI, no product metadata changes.
 * Maps zip row order → CSV SKU; image index → CSV color order; writes per color folder.
 *
 *   node scripts/replace-product-images-bulk.mjs <csv> <zip> [--dry-run]
 *   node scripts/replace-product-images-bulk.mjs <csv> <zip> \
 *     --category mens-shirt --collection ajrakh-shirts
 */
import {
  readdirSync,
  unlinkSync,
  mkdirSync,
  existsSync,
  mkdtempSync,
  writeFileSync,
  copyFileSync,
} from "fs";
import { execSync } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import os from "os";
import ExcelJS from "exceljs";
import sharp from "sharp";

const ROOT = process.cwd();
const CMS_PATH = path.join(ROOT, "data", "cms-db.json");
const PUBLIC_ROOT = path.join(ROOT, "public", "uploads", "ai-products");
const dryRun = process.argv.includes("--dry-run");

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const DEFAULT_CATEGORY = argValue("--category") ?? "mens-shirt";
const DEFAULT_COLLECTION = argValue("--collection") ?? "ajrakh-shirts";

function readEnglish(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value.en === "string") {
    return value.en.trim();
  }
  return String(value ?? "").trim();
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringValue(row, key) {
  return String(row[key] ?? "").trim();
}

function colorToken(color) {
  return color
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseImageFileName(name) {
  const base = name.replace(/\.[^.]+$/i, "");
  const grouped = base.match(/^(\d+)\s*[A-Za-z]*\s*\((\d+)\)$/i);
  if (grouped) {
    return { product: Number(grouped[1]), index: Number(grouped[2]) };
  }
  const single = base.match(/^(\d+)\s*[A-Za-z]*$/i);
  if (single) return { product: Number(single[1]), index: 1 };
  return { product: 9999, index: 9999 };
}

function listZipImageGroups(extractDir) {
  const entries = readdirSync(extractDir, { recursive: true });
  const files = entries
    .filter((entry) => /\.(jpe?g|png|webp)$/i.test(entry))
    .map((entry) => path.join(extractDir, entry));

  const byProduct = new Map();
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

function mapImagesToColors(imageFiles, colors) {
  return colors.map((color, index) => ({
    color,
    sourceFile: imageFiles[index] ?? imageFiles[imageFiles.length - 1] ?? "",
  }));
}

async function parseCsvFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.csv.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`No worksheet in ${filePath}`);

  const headers = [];
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value ?? "").trim();
      });
      return;
    }
    const record = {};
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber];
      if (key) record[key] = cell.value;
    });
    if (stringValue(record, "name") || stringValue(record, "sku")) {
      rows.push(record);
    }
  });
  return rows;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function inferPathFromExistingUrl(url) {
  const match = String(url ?? "").match(
    /\/api\/public\/ai-products\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/[^/]+$/i,
  );
  if (!match) return null;
  return {
    category: match[1],
    collection: match[2],
    attributeType: match[3],
    colorFolder: match[4],
    filename: path.posix.basename(url),
  };
}

function inferPattern(collection) {
  const value = String(collection ?? "").toLowerCase();
  if (value.includes("ajrakh")) return "ajrakh";
  if (value.includes("printed")) return "printed";
  return "textile";
}

function buildFilename(category, collection, color, sku) {
  const parts = [category, collection, color, inferPattern(collection), sku];
  return `${parts.map((part) => slugify(part).toUpperCase()).join("_")}.jpg`;
}

function findExistingUrlForColor(product, color) {
  const label = color.trim().toLowerCase();
  const token = colorToken(color);
  const words = label.split(/\s+/).filter((word) => word.length > 1);

  return (product.images ?? []).find((url) => {
    const normalized = decodeURIComponent(String(url).toLowerCase());
    const compact = normalized.replace(/[^a-z0-9]+/g, "");
    if (token && compact.includes(token)) return true;
    if (label && normalized.includes(`/${label}/`)) return true;
    return words.length > 0 && words.every((word) => normalized.includes(word));
  });
}

function clearDirectory(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    unlinkSync(path.join(dir, entry));
  }
}

async function writeImage(sourceFile, destPath) {
  const sourceExt = path.extname(sourceFile).toLowerCase();
  const destExt = path.extname(destPath).toLowerCase();

  if (sourceExt === destExt) {
    copyFileSync(sourceFile, destPath);
    return;
  }

  if (destExt === ".jpg" || destExt === ".jpeg") {
    await sharp(sourceFile)
      .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toFile(destPath);
    return;
  }
  if (destExt === ".webp") {
    await sharp(sourceFile).webp({ quality: 92 }).toFile(destPath);
    return;
  }
  if (destExt === ".png") {
    await sharp(sourceFile).png().toFile(destPath);
    return;
  }
  await sharp(sourceFile)
    .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(destPath);
}

async function replaceColorImage(product, color, sourceFile, layout) {
  if (!sourceFile)
    throw new Error(`Missing source file for ${product.sku} ${color}`);

  const token = colorToken(color);
  const existingUrl = findExistingUrlForColor(product, color);
  const parsed = existingUrl ? inferPathFromExistingUrl(existingUrl) : null;

  const category = parsed?.category ?? layout.category;
  const collection = parsed?.collection ?? layout.collection;
  const attributeType = parsed?.attributeType ?? product.sku.toLowerCase();
  const colorFolder = decodeURIComponent(parsed?.colorFolder ?? token);
  const filename =
    parsed?.filename ?? buildFilename(category, collection, color, product.sku);

  const publicRelative = [
    category,
    collection,
    attributeType,
    colorFolder,
    filename,
  ].join("/");
  const destPath = path.join(PUBLIC_ROOT, ...publicRelative.split("/"));
  const destDir = path.dirname(destPath);

  if (!dryRun) {
    mkdirSync(destDir, { recursive: true });
    clearDirectory(destDir);
    await writeImage(sourceFile, destPath);
  }

  return `/api/public/ai-products/${publicRelative}`;
}

async function main() {
  const csvPath = process.argv[2];
  const zipPath = process.argv[3];
  if (!csvPath || !zipPath || csvPath.startsWith("--")) {
    throw new Error(
      "Usage: node scripts/replace-product-images-bulk.mjs <csv> <zip> [--dry-run] [--category mens-shirt] [--collection ajrakh-shirts]",
    );
  }
  if (!existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);
  if (!existsSync(zipPath)) throw new Error(`Zip not found: ${zipPath}`);

  const rows = await parseCsvFile(csvPath);
  const extractDir = mkdtempSync(path.join(os.tmpdir(), "bulk-img-replace-"));
  execSync(
    `unzip -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(extractDir)}`,
  );
  const imageGroups = listZipImageGroups(extractDir);

  if (imageGroups.length !== rows.length) {
    throw new Error(
      `CSV has ${rows.length} products but zip has ${imageGroups.length} image groups`,
    );
  }

  const cms = JSON.parse(await readFile(CMS_PATH, "utf8"));
  const bySku = new Map(
    (cms.products ?? []).map((product) => [
      String(product.sku ?? "").toUpperCase(),
      product,
    ]),
  );

  let replaced = 0;
  let skipped = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const sku = stringValue(row, "sku").toUpperCase();
    const csvColors = splitList(stringValue(row, "colors"));
    const product = bySku.get(sku);
    if (!product) {
      console.warn(`  ! skip ${sku} — not in CMS`);
      skipped += 1;
      continue;
    }

    const colors = csvColors.length
      ? csvColors
      : (product.colors ?? []).map((color) => readEnglish(color));
    if (!colors.length) colors.push("Assorted");

    const mappings = mapImagesToColors(imageGroups[index] ?? [], colors);
    const colorToUrl = new Map();

    for (const mapping of mappings) {
      if (!mapping.sourceFile) continue;
      const url = await replaceColorImage(
        product,
        mapping.color,
        mapping.sourceFile,
        {
          category: DEFAULT_CATEGORY,
          collection: DEFAULT_COLLECTION,
        },
      );
      colorToUrl.set(colorToken(mapping.color), url);
      console.log(
        `  ${dryRun ? "[dry-run] " : ""}${sku} ${mapping.color} ← ${path.basename(mapping.sourceFile)}`,
      );
      replaced += 1;
    }

    const cmsColors = (product.colors ?? []).map((color) => readEnglish(color));
    const nextImages = cmsColors.map((color) => {
      const token = colorToken(color);
      return (
        colorToUrl.get(token) ??
        findExistingUrlForColor(product, color) ??
        product.images?.[0] ??
        ""
      );
    });

    product.images = nextImages.filter(Boolean);
  }

  if (!dryRun) {
    writeFileSync(CMS_PATH, `${JSON.stringify(cms, null, 2)}\n`, "utf8");
    console.log(`\nUpdated ${CMS_PATH}`);
  }

  console.log(
    `\nDone. ${replaced} image(s) ${dryRun ? "would be " : ""}replaced, ${skipped} SKU(s) skipped.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
