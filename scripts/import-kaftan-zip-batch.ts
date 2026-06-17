/**
 * Import multiple Women's Kaftan products from a flat zip (5 designs × 5 colors).
 * Groups images by perceptual hash, copies MOQ/price/description from existing kaftans.
 *
 *   npx tsx --env-file=.env.local scripts/import-kaftan-zip-batch.ts \
 *     --zip "/path/NewKaftanKunal.zip"
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { Product } from "../src/data/mock";
import {
  getCmsSnapshotForPatch,
  saveCmsSnapshot,
  upsertCmsProducts,
} from "../src/lib/cms-store";
import { asStoredProducts } from "../src/lib/cms-admin-view";
import { localizeProductsOnSaveFast } from "../src/lib/product-localize";
import { resolveCmsUploadsRoot } from "../src/lib/cms-uploads-path";
import { buildSetStockFieldsFromBulk } from "../src/lib/bulk-product-stock";
import {
  categoryNamesFromProducts,
  ensureCategoryMasterEntries,
  ensureCategoryHubSubcategories,
  firstProductImageByCategory,
} from "../src/lib/cms-category-sync";
import { alignProductColorsWithImages } from "../src/lib/product-color-order";
import { readEnglish } from "../src/lib/cms-localize";

const KAFTAN_TEMPLATE = {
  category: "Women's wear",
  fabric: "Modal",
  price: 660,
  moq: 1,
  sizes: ["Free Size"],
  stockRegularSets: 3,
  care: "Hand wash separately",
  description:
    "Crafted from soft and flowy premium modal fabric, this Ajrakh Kaftan Shirt combines timeless craftsmanship with contemporary elegance. Featuring authentic Ajrakh block prints and a relaxed silhouette, it offers exceptional comfort, effortless drape, and versatile styling. Designed for modern women who value heritage, quality, and understated sophistication.",
};

const DEFAULT_COLORS = ["Maroon", "Yellow", "Cream", "Indigo", "Black"];

const PRODUCT_NAMES = [
  "Royal Boota Modal Kaftan Shirt",
  "Classic Jaal Modal Kaftan Shirt",
  "Artisan Stripe Modal Kaftan Shirt",
  "Peacock Buta Modal Kaftan Shirt",
  "Heritage Panel Modal Kaftan Shirt",
];

const SKU_LIST = [
  "STKFAJMD06",
  "STKFAJMD07",
  "STKFAJMD08",
  "STKFAJMD09",
  "STKFAJMD10",
];

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const IMAGE_GROUPS = [
  [
    "06cc1c3c-9ba5-4a9c-b6e8-9c6de73eb924.webp",
    "484f0f7b-d441-450d-8f83-72dc207c3192.webp",
    "9880434a-8e83-4f57-8a22-922c588f5744.webp",
    "a0092ee8-ac72-4860-8366-59a4ef3e15df.webp",
    "f7abd36a-eb76-422e-881e-acb0ba1d7df3.webp",
  ],
  [
    "53be0b62-c606-4e08-8134-f819f6260370.webp",
    "0d390d94-dc92-4360-9b80-8a8a4ebeb147.webp",
    "3a42986c-a8ec-42dc-92be-fddebd7876a9.webp",
    "dab22295-c66d-4e97-ac8a-816f241a462a.webp",
    "fe81b39e-a582-45dc-8f4d-c18b7d410c5b.webp",
  ],
  [
    "ed0e9377-ab20-4964-addb-6afc05d1301f.webp",
    "642ff10b-cfb9-434d-8d7e-7463c2d31513.webp",
    "1b44397b-9426-4489-8286-822846b565bd.webp",
    "2bdf38f2-cced-40bd-8906-8982e517c702.webp",
    "2c6f81ff-131c-4447-b0c0-3953ed76baf6.webp",
  ],
  [
    "325c5714-a8f4-4db3-80c2-3a8035a8a54e.webp",
    "dc91a195-bdfe-423e-950d-094961badf8e.webp",
    "2e8541c0-4cc6-4e07-96a4-3b28acd24c50.webp",
    "80acb74f-7f2a-407e-8569-7246df781861.webp",
    "20022e1d-025e-4653-9275-9ee995cf1835.webp",
  ],
  [
    "2d3e7141-0e57-465d-9aea-61d718f17a1e.webp",
    "dedd4cb8-c894-48a8-b772-22e46986d8ae.webp",
    "df9b6930-c06c-4b5f-b8a8-e590cc401e8c.webp",
    "290caacc-73f4-4ed4-bad6-70e07a878f25.webp",
    "9653ae7f-21ec-4ea7-a8cd-94ff3a9e5a21.webp",
  ],
];

function resolveImageGroups(files: string[]): string[][] {
  const byBase = new Map(files.map((file) => [path.basename(file), file]));
  return IMAGE_GROUPS.map((group) =>
    group.map((name) => {
      const file = byBase.get(name);
      if (!file) throw new Error(`Missing image in zip: ${name}`);
      return file;
    }),
  );
}

function listZipImages(extractDir: string): string[] {
  const entries = fs.readdirSync(extractDir, { recursive: true }) as string[];
  return entries
    .filter((entry) => /\.(jpe?g|png|webp)$/i.test(entry))
    .map((entry) => path.join(extractDir, entry))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function uploadImageToCms(sourceFile: string): Promise<string> {
  const uploadDir = resolveCmsUploadsRoot();
  await mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${randomUUID()}.webp`;
  const dest = path.join(uploadDir, filename);
  const input = await fs.promises.readFile(sourceFile);
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .webp({ quality: 76, effort: 4 })
    .toBuffer();
  await writeFile(dest, buffer);
  return `/uploads/cms/${filename}`;
}

function buildProduct(
  name: string,
  sku: string,
  images: string[],
  colors: string[],
): Product {
  const variants = colors.map((color) => ({
    sku: `${sku}-${color.slice(0, 3).toUpperCase()}-FS`.replace(/\s+/g, ""),
    color,
    size: "Free Size",
    price: KAFTAN_TEMPLATE.price,
    stock: KAFTAN_TEMPLATE.stockRegularSets,
  }));
  const setStockFields = buildSetStockFieldsFromBulk({
    colors,
    sizes: KAFTAN_TEMPLATE.sizes,
    stockRegularSets: KAFTAN_TEMPLATE.stockRegularSets,
    stockPlusSets: 0,
    totalStock: 0,
  });

  return {
    id: `PRD-${sku}`,
    slug: slugify(name),
    name,
    sku,
    category: KAFTAN_TEMPLATE.category,
    categoryPath: [KAFTAN_TEMPLATE.category],
    categoryLevel1: KAFTAN_TEMPLATE.category,
    categorySlug: "womens-wear",
    fabric: KAFTAN_TEMPLATE.fabric,
    fabricSlug: "modal",
    price: KAFTAN_TEMPLATE.price,
    moq: KAFTAN_TEMPLATE.moq,
    stock: setStockFields.stock,
    colors,
    sizes: KAFTAN_TEMPLATE.sizes,
    stockRegularSets: setStockFields.stockRegularSets,
    stockPlusSets: setStockFields.stockPlusSets,
    variants,
    images,
    description: KAFTAN_TEMPLATE.description,
    care: KAFTAN_TEMPLATE.care,
    metaTitle: name,
    isFeatured: false,
  };
}

async function main() {
  const zipPath = argValue("--zip");
  if (!zipPath) {
    throw new Error("Usage: import-kaftan-zip-batch.ts --zip <path>");
  }
  if (!fs.existsSync(zipPath)) throw new Error(`Zip not found: ${zipPath}`);

  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "kaftan-batch-"));
  execSync(
    `unzip -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(extractDir)}`,
  );
  const files = listZipImages(extractDir);
  if (files.length !== 25) {
    throw new Error(`Expected 25 images (5×5), found ${files.length}`);
  }

  const groups = resolveImageGroups(files);

  const cms = await getCmsSnapshotForPatch();
  const existingBySku = new Map(
    (cms.products ?? []).map((product) => [
      String(product.sku ?? "").toUpperCase(),
      product,
    ]),
  );

  const products: Product[] = [];
  for (let index = 0; index < groups.length; index += 1) {
    const name = PRODUCT_NAMES[index] ?? `Modal Kaftan Shirt ${index + 1}`;
    const sku =
      SKU_LIST[index] ?? `${SKU_LIST[0]?.replace(/\d+$/, "")}${index + 1}`;
    const existing = existingBySku.get(sku.toUpperCase());
    const colors = [...DEFAULT_COLORS];
    console.log(`\n${name} (${sku})`);
    const images: string[] = [];
    for (const [colorIndex, sourceFile] of groups[index].entries()) {
      const url = await uploadImageToCms(sourceFile);
      images.push(url);
      console.log(`  ${colors[colorIndex]} ← ${path.basename(sourceFile)}`);
    }
    const built = buildProduct(name, sku, images, colors);
    const aligned = alignProductColorsWithImages(built);
    products.push({
      ...built,
      id: existing?.id ?? built.id,
      slug: existing?.slug ?? built.slug,
      colors: aligned.colors.map((color) =>
        typeof color === "string" ? color : readEnglish(color),
      ),
      variants: aligned.variants ?? built.variants,
    });
  }

  const stored = asStoredProducts(localizeProductsOnSaveFast(products));
  await upsertCmsProducts(stored, cms);

  const allProducts = asStoredProducts([
    ...(cms.products ?? []).filter(
      (item) =>
        !stored.some(
          (next) =>
            String(next.sku ?? "").toUpperCase() ===
            String(item.sku ?? "").toUpperCase(),
        ),
    ),
    ...stored,
  ]);
  const categoryNames = categoryNamesFromProducts(allProducts);
  const refreshed = await getCmsSnapshotForPatch();
  const categoryMaster = ensureCategoryMasterEntries(
    refreshed.categoryMaster ?? [],
    categoryNames,
  );
  const categoryHubPages = ensureCategoryHubSubcategories(
    refreshed.categoryHubPages ?? [],
    categoryNames,
    { productImageByCategory: firstProductImageByCategory(allProducts) },
  );
  await saveCmsSnapshot({ categoryMaster, categoryHubPages }, refreshed, {
    light: true,
  });
  await writeFile(
    path.join(process.cwd(), "data", "cms-db.json"),
    `${JSON.stringify(
      {
        ...(await getCmsSnapshotForPatch()),
        products: allProducts,
        categoryMaster,
        categoryHubPages,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("\nImported 5 kaftan products:");
  for (const product of stored) {
    console.log(
      `  ${product.sku} — ${readEnglish(product.name as string)} (${(product.images as string[]).length} color photos)`,
    );
  }
  console.log("\nPush live:");
  console.log("  node scripts/sync-cms.mjs push-product-images");
  console.log("  node scripts/sync-cms.mjs push-product-colors");
  console.log("  node scripts/push-uploads-http.mjs --sku-prefix STKFAJMD");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
