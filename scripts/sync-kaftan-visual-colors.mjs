#!/usr/bin/env node
/**
 * Kaftan studio folders are mislabeled vs garment color on disk.
 * Align CMS color labels with what each image actually shows:
 *   images[2] (cream/) → Yellow garment
 *   images[4] (yellow/) → Maroon garment (second maroon variant)
 *
 *   node scripts/sync-kaftan-visual-colors.mjs [--dry-run]
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

function setLocalizedColor(label) {
  return { en: label, hi: label, gu: label, mt: true };
}

function relabelColorField(field, nextLabel) {
  if (!field) return setLocalizedColor(nextLabel);
  if (typeof field === "string") return nextLabel;
  return { ...field, en: nextLabel, hi: nextLabel, gu: nextLabel, mt: true };
}

function alignKaftanProduct(product) {
  const sku = String(product.sku ?? "").toUpperCase();
  if (!sku.startsWith("STKFAJMD")) return { product, changed: false };

  const colors = product.colors ?? [];
  const images = (product.images ?? []).filter(Boolean);
  if (colors.length !== 5 || images.length !== 5) {
    return { product, changed: false };
  }

  const labels = colors.map((color) => readEnglish(color));
  const target = ["Indigo", "Maroon", "Yellow", "Black", "Maroon"];
  if (labels.join("|") === target.join("|")) {
    return { product, changed: false };
  }

  const nextColors = target.map((label, index) =>
    relabelColorField(colors[index], label),
  );

  const nextVariants = (product.variants ?? []).map((variant, index) => {
    const label = target[index];
    if (!label) return variant;
    return {
      ...variant,
      color: relabelColorField(variant.color, label),
    };
  });

  return {
    product: {
      ...product,
      colors: nextColors,
      variants: nextVariants,
    },
    changed: true,
    before: labels.join(", "),
    after: target.join(", "),
  };
}

async function main() {
  const raw = await readFile(CMS_PATH, "utf8");
  const cms = JSON.parse(raw);
  let changedCount = 0;

  cms.products = (cms.products ?? []).map((product) => {
    const result = alignKaftanProduct(product);
    if (result.changed) {
      changedCount += 1;
      console.log(`  ${product.sku}: ${result.before} → ${result.after}`);
    }
    return result.product;
  });

  console.log(`Updated ${changedCount} kaftan product(s).`);
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
