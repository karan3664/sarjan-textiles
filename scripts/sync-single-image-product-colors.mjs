#!/usr/bin/env node
/**
 * Products with one real photo should have one CMS color (+ matching variants).
 *
 *   node scripts/sync-single-image-product-colors.mjs [--dry-run]
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";

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

function isPlaceholder(url) {
  const normalized = String(url ?? "").toLowerCase();
  return (
    !normalized ||
    normalized.includes("sarjan-logo-icon") ||
    normalized.includes("sarjan-logo-full") ||
    normalized.includes("sarjan-logo-placeholder") ||
    normalized.includes("sarjan-logo.svg")
  );
}

function uniqueRealImages(images) {
  return [
    ...new Set(
      (images ?? []).filter((url) => url?.trim() && !isPlaceholder(url)),
    ),
  ];
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

function colorsMatchImageToken(colorLabel, imageToken) {
  const colorToken = colorMatchToken(colorLabel);
  const token = colorMatchToken(imageToken);
  if (!colorToken || !token) return false;
  if (colorToken === token) return true;
  const colorAliases = COLOR_IMAGE_ALIASES[colorToken] ?? [];
  const tokenAliases = COLOR_IMAGE_ALIASES[token] ?? [];
  return colorAliases.includes(token) || tokenAliases.includes(colorToken);
}

function colorTokenFromImageUrl(imageUrl) {
  const normalized = String(imageUrl ?? "").toLowerCase();
  const folderMatch = normalized.match(
    /\/(indigo|maroon|black|yellow|cream|navy|white|ivory|offwhite|assorted)\/[^/]+\.(jpe?g|png|webp)(?:\?|$)/i,
  );
  if (folderMatch?.[1]) return colorMatchToken(folderMatch[1]);

  const fileMatch = normalized.match(
    /[_-](indigo|maroon|black|yellow|cream|navy|white|ivory|offwhite|assorted)[_-]/i,
  );
  if (fileMatch?.[1]) return colorMatchToken(fileMatch[1]);
  return null;
}

function colorLabels(product) {
  return (product.colors ?? []).map((color) => readEnglish(color));
}

function pickSingleColor(product, labels) {
  const images = uniqueRealImages(product.images);
  const imageUrl = images[0];

  if (imageUrl) {
    const token = colorTokenFromImageUrl(imageUrl);
    if (token) {
      const byToken = labels.find((label) =>
        colorsMatchImageToken(label, token),
      );
      if (byToken) return byToken;
    }
    if (/assorted/i.test(imageUrl)) {
      const assorted = labels.find((label) => /assorted/i.test(label));
      if (assorted) return assorted;
    }
  }

  const alt = String(product.imageAlt ?? "").toLowerCase();
  if (alt) {
    const byAlt = labels.find((label) => alt.includes(label.toLowerCase()));
    if (byAlt) return byAlt;
  }

  const variantColors = [
    ...new Set(
      (product.variants ?? [])
        .map((variant) => readEnglish(variant.color))
        .filter(Boolean),
    ),
  ];
  if (variantColors.length === 1) return variantColors[0];

  return labels[0] ?? "Default";
}

function colorEntryForLabel(product, label) {
  const colors = product.colors ?? [];
  const match = colors.find(
    (color) => readEnglish(color).toLowerCase() === label.toLowerCase(),
  );
  if (match) return match;
  return label;
}

function alignProduct(product) {
  const labels = colorLabels(product);
  if (!labels.length) return { product, changed: false };

  const images = uniqueRealImages(product.images);
  if (images.length > 1) return { product, changed: false };

  const keepLabel = pickSingleColor(product, labels);
  if (
    labels.length === 1 &&
    readEnglish(labels[0]).toLowerCase() === keepLabel.toLowerCase()
  ) {
    return { product, changed: false };
  }

  const keepColor = colorEntryForLabel(product, keepLabel);
  const nextVariants = (product.variants ?? []).filter(
    (variant) =>
      readEnglish(variant.color).toLowerCase() === keepLabel.toLowerCase(),
  );
  const nextImages =
    images.length > 0
      ? [images[0]]
      : (product.images ?? []).filter(Boolean).slice(0, 1);

  return {
    product: {
      ...product,
      colors: [keepColor],
      variants: nextVariants.length ? nextVariants : product.variants,
      images: nextImages.length ? nextImages : product.images,
    },
    changed: true,
    keepLabel,
    before: labels,
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
      console.log(
        `  ${product.sku}: ${result.before.join(", ")} → ${result.keepLabel}`,
      );
    }
    return result.product;
  });

  console.log(`Single-color sync for ${changedCount} product(s).`);
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
