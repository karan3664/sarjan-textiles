#!/usr/bin/env node
/**
 * Detect garment color in each CMS product image and rewrite colors[] from photos.
 * Ignores sheet/CMS color columns — one label per image.
 *
 *   node scripts/align-cms-colors-from-images.mjs [--dry-run]
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { inferGarmentColorLabelsFromImages } from "../src/lib/garment-color-from-image.ts";

const ROOT = process.cwd();
const CMS_PATH = path.join(ROOT, "data", "cms-db.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const dryRun = process.argv.includes("--dry-run");

function readEnglish(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value.en === "string") {
    return value.en.trim();
  }
  return String(value ?? "").trim();
}

function setLocalizedColor(field, nextLabel) {
  if (!field || typeof field === "string") {
    return { en: nextLabel, hi: nextLabel, gu: nextLabel, mt: true };
  }
  return { ...field, en: nextLabel, hi: nextLabel, gu: nextLabel, mt: true };
}

function reorderVariants(variants, orderedLabels) {
  const used = new Set();
  const reordered = [];

  for (const label of orderedLabels) {
    const matchIndex = variants.findIndex(
      (variant, index) =>
        !used.has(index) &&
        readEnglish(variant.color).toLowerCase() === label.toLowerCase(),
    );
    if (matchIndex >= 0) {
      used.add(matchIndex);
      reordered.push(variants[matchIndex]);
    }
  }

  for (let index = 0; index < variants.length; index += 1) {
    if (!used.has(index)) reordered.push(variants[index]);
  }

  return reordered;
}

async function labelsForProduct(product) {
  return inferGarmentColorLabelsFromImages(product, {
    publicDir: PUBLIC_DIR,
    sharp,
  });
}

async function main() {
  const raw = await readFile(CMS_PATH, "utf8");
  const cms = JSON.parse(raw);
  let changedCount = 0;

  for (const product of cms.products ?? []) {
    const images = (product.images ?? []).filter(Boolean);
    if (!images.length) continue;

    const before = (product.colors ?? []).map((color) => readEnglish(color));
    const detected = await labelsForProduct(product);
    if (!detected || detected.length !== images.length) {
      console.log(`  skip ${product.sku}: could not detect image colors`);
      continue;
    }

    if (before.join("|") === detected.join("|")) continue;

    const nextColors = detected.map((label, index) =>
      setLocalizedColor(product.colors?.[index], label),
    );
    const variantColors = new Set(
      (product.variants ?? []).map((variant) =>
        readEnglish(variant.color).toLowerCase(),
      ),
    );
    const nextVariants =
      product.variants?.length && variantColors.size > 1
        ? reorderVariants(product.variants, detected)
        : product.variants;

    console.log(
      `  ${product.sku}: ${before.join(", ") || "(none)"} → ${detected.join(", ")}`,
    );
    product.colors = nextColors;
    product.variants = nextVariants;
    changedCount += 1;
  }

  console.log(`Aligned ${changedCount} product(s).`);
  if (dryRun || changedCount === 0) {
    if (dryRun) console.log("Dry run — cms-db.json not written.");
    return;
  }

  await writeFile(CMS_PATH, `${JSON.stringify(cms, null, 2)}\n`, "utf8");
  console.log(`Wrote ${CMS_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
