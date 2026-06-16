#!/usr/bin/env node
/**
 * Align product.colors (and variants) with images[] order using URL folder tokens.
 *
 *   node scripts/sync-product-colors-to-image-order.mjs [--dry-run]
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const CMS_PATH = path.join(ROOT, "data", "cms-db.json");
const dryRun = process.argv.includes("--dry-run");

function readEnglish(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value.en === "string") {
    return value.en.trim();
  }
  return String(value ?? "").trim();
}

function colorMatchToken(color) {
  return color
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const COLOR_IMAGE_ALIASES = {
  indigo: ["navy", "navyblue"],
  navy: ["indigo", "navyblue"],
  navyblue: ["indigo", "navy"],
  cream: ["white", "offwhite", "ivory"],
  white: ["cream", "offwhite", "ivory"],
};

function colorTokenFromImageUrl(imageUrl) {
  const normalized = String(imageUrl ?? "").toLowerCase();
  const folderMatch = normalized.match(
    /\/(indigo|maroon|black|yellow|cream|navy|white|ivory|offwhite)\/[^/]+\.(jpe?g|png|webp)(?:\?|$)/i,
  );
  if (folderMatch?.[1]) return colorMatchToken(folderMatch[1]);

  const fileMatch = normalized.match(
    /[_-](indigo|maroon|black|yellow|cream|navy|white|ivory|offwhite)[_-]/i,
  );
  if (fileMatch?.[1]) return colorMatchToken(fileMatch[1]);
  return null;
}

function colorsMatchImageToken(colorLabel, imageToken) {
  const colorToken = colorMatchToken(colorLabel);
  const token = colorMatchToken(imageToken);
  if (!colorToken || !token) return false;
  if (colorToken === token) return true;
  const colorAliases = COLOR_IMAGE_ALIASES[colorToken] ?? [];
  const tokenAliases = COLOR_IMAGE_ALIASES[token] ?? [];
  return colorAliases.includes(token) || tokenAliases.includes(colorToken);
}

function reorderColorsToMatchImages(colors, images) {
  const used = new Set();
  const reordered = [];

  for (const image of images) {
    const token = colorTokenFromImageUrl(image);
    if (!token) {
      const fallbackIndex = reordered.length;
      if (fallbackIndex < colors.length && !used.has(fallbackIndex)) {
        used.add(fallbackIndex);
        reordered.push(colors[fallbackIndex]);
      }
      continue;
    }

    const matchIndex = colors.findIndex(
      (color, index) =>
        !used.has(index) && colorsMatchImageToken(readEnglish(color), token),
    );
    if (matchIndex >= 0) {
      used.add(matchIndex);
      reordered.push(colors[matchIndex]);
      continue;
    }

    const fallbackIndex = reordered.length;
    if (fallbackIndex < colors.length && !used.has(fallbackIndex)) {
      used.add(fallbackIndex);
      reordered.push(colors[fallbackIndex]);
    }
  }

  for (let index = 0; index < colors.length; index += 1) {
    if (!used.has(index)) reordered.push(colors[index]);
  }

  return reordered.length === colors.length ? reordered : colors;
}

function reorderVariantsToMatchColorList(variants, orderedColorLabels) {
  const used = new Set();
  const reordered = [];

  for (const label of orderedColorLabels) {
    const matchIndex = variants.findIndex(
      (variant, index) =>
        !used.has(index) &&
        readEnglish(variant.color).trim().toLowerCase() ===
          label.trim().toLowerCase(),
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

function colorsAlignedWithImages(colors, images) {
  return colors.every((color, index) => {
    const token = colorTokenFromImageUrl(images[index] ?? "");
    if (!token) return true;
    return colorsMatchImageToken(color, token);
  });
}

function alignProduct(product) {
  const colors = product.colors ?? [];
  const images = (product.images ?? []).filter(Boolean);
  if (!colors.length || colors.length !== images.length) {
    return { product, changed: false };
  }

  const labels = colors.map((color) => readEnglish(color));
  if (colorsAlignedWithImages(labels, images)) {
    return { product, changed: false };
  }

  const nextColors = reorderColorsToMatchImages(colors, images);
  const nextLabels = nextColors.map((color) => readEnglish(color));
  const nextVariants = product.variants?.length
    ? reorderVariantsToMatchColorList(product.variants, nextLabels)
    : product.variants;

  return {
    product: {
      ...product,
      colors: nextColors,
      variants: nextVariants,
    },
    changed: true,
  };
}

async function main() {
  const raw = await readFile(CMS_PATH, "utf8");
  const cms = JSON.parse(raw);
  let changedCount = 0;

  cms.products = (cms.products ?? []).map((product) => {
    const result = alignProduct(product);
    if (result.changed) {
      changedCount += 1;
      const sku = product.sku ?? product.id;
      const before = (product.colors ?? []).map((color) => readEnglish(color));
      const after = (result.product.colors ?? []).map((color) =>
        readEnglish(color),
      );
      console.log(`  ${sku}: ${before.join(", ")} → ${after.join(", ")}`);
    }
    return result.product;
  });

  console.log(`Aligned colors for ${changedCount} product(s).`);
  if (dryRun) {
    console.log("Dry run — cms-db.json not written.");
    return;
  }

  if (changedCount > 0) {
    await writeFile(CMS_PATH, `${JSON.stringify(cms, null, 2)}\n`, "utf8");
    console.log(`Updated ${CMS_PATH}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
