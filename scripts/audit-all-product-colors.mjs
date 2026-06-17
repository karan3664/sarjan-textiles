#!/usr/bin/env node
/**
 * Audit all CMS products — photo-detected colors vs stored colors.
 *   node scripts/audit-all-product-colors.mjs
 */
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { inferGarmentColorLabelsFromImages } from "../src/lib/garment-color-from-image.ts";
import { isProductPlaceholderImage } from "../src/lib/product-placeholder-image.ts";

const CMS_PATH = path.join(process.cwd(), "data", "cms-db.json");

function readEnglish(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value.en === "string") {
    return value.en.trim();
  }
  return String(value ?? "").trim();
}

async function main() {
  const cms = JSON.parse(await readFile(CMS_PATH, "utf8"));
  const products = cms.products ?? [];
  let ok = 0;
  let fixed = 0;
  let skip = 0;

  console.log("SKU           | imgs | STORED => DETECTED");
  console.log("-".repeat(72));

  for (const product of products) {
    const images = (product.images ?? []).filter(
      (url) => url?.trim() && !isProductPlaceholderImage(url),
    );
    const stored = (product.colors ?? []).map(readEnglish).filter(Boolean);
    const sku = String(product.sku ?? "?").padEnd(13);

    if (!images.length) {
      skip += 1;
      console.log(`${sku} |  0   | NO PHOTOS (${stored.join(", ") || "none"})`);
      continue;
    }

    const detected = await inferGarmentColorLabelsFromImages(product, {
      publicDir: path.join(process.cwd(), "public"),
      sharp,
    });

    if (!detected) {
      skip += 1;
      console.log(
        `${sku} | ${String(images.length).padStart(2)}   | DETECT FAIL`,
      );
      continue;
    }

    const same =
      stored.length === detected.length &&
      stored.every(
        (color, index) => color.toLowerCase() === detected[index].toLowerCase(),
      );

    if (same) {
      ok += 1;
      console.log(
        `${sku} | ${String(images.length).padStart(2)}   | OK  ${detected.join(", ")}`,
      );
    } else {
      fixed += 1;
      console.log(
        `${sku} | ${String(images.length).padStart(2)}   | FIX ${stored.join(", ") || "(none)"} => ${detected.join(", ")}`,
      );
    }
  }

  console.log("-".repeat(72));
  console.log(
    `Total ${products.length} | OK ${ok} | Need align ${fixed} | Skip ${skip}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
