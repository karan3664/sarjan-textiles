/**
 * Map folder photos → existing Ajrakh shirt products by file name.
 *   "Bahaar (1).webp" → bahaar-ajrakh-block-print-shirt-cotton
 *
 *   npx tsx --env-file=.env.local scripts/import-remaining-shirts-folder.ts \
 *     "/Users/kbrahmaxatr/Downloads/Remaining Shirts"
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getCmsSnapshotForPatch, saveCmsSnapshot } from "../src/lib/cms-store";
import { asStoredProducts } from "../src/lib/cms-admin-view";
import { resolveCmsUploadsRoot } from "../src/lib/cms-uploads-path";

const NAME_TO_SLUG: Record<string, string> = {
  aakaar: "aakaar-ajrakh-block-print-shirt-cotton",
  bahaar: "bahaar-ajrakh-block-print-shirt-cotton",
  gagan: "gagan-ajrakh-block-print-shirt-cotton",
  meridian: "meridian-ajrakh-block-print-shirt-cotton",
  tatva: "tattva-ajrakh-block-print-shirt-cotton",
  tattva: "tattva-ajrakh-block-print-shirt-cotton",
};

function parseFile(base: string): { key: string; index: number } | null {
  const name = base.replace(/\.[^.]+$/i, "").trim();
  const grouped = name.match(/^(.+?)\s*\((\d+)\)$/i);
  if (grouped) {
    return {
      key: grouped[1].trim().toLowerCase(),
      index: Number(grouped[2]),
    };
  }
  return { key: name.toLowerCase(), index: 1 };
}

async function uploadImage(sourceFile: string): Promise<string> {
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

async function main() {
  const folder = process.argv[2];
  if (!folder || !fs.existsSync(folder)) {
    throw new Error(
      "Usage: import-remaining-shirts-folder.ts <folder-with-webp-files>",
    );
  }

  const files = fs
    .readdirSync(folder)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => {
      const parsed = parseFile(f);
      if (!parsed) return null;
      const slug = NAME_TO_SLUG[parsed.key];
      if (!slug) return null;
      return {
        file: path.join(folder, f),
        slug,
        index: parsed.index,
        key: parsed.key,
      };
    })
    .filter(Boolean) as Array<{
    file: string;
    slug: string;
    index: number;
    key: string;
  }>;

  if (!files.length) throw new Error("No matching shirt images in folder");

  const bySlug = new Map<string, typeof files>();
  for (const item of files) {
    const list = bySlug.get(item.slug) ?? [];
    list.push(item);
    bySlug.set(item.slug, list);
  }

  const uploaded = new Map<string, string[]>();
  for (const [slug, items] of bySlug) {
    items.sort((a, b) => a.index - b.index);
    const urls: string[] = [];
    for (const item of items) {
      const url = await uploadImage(item.file);
      urls.push(url);
      console.log(`  ${path.basename(item.file)} → ${slug}`);
    }
    uploaded.set(slug, urls);
  }

  const cms = await getCmsSnapshotForPatch();
  const products = [...(cms.products ?? [])];
  let updated = 0;
  for (let i = 0; i < products.length; i++) {
    const slug = String(products[i].slug ?? "");
    const images = uploaded.get(slug);
    if (!images?.length) continue;
    products[i] = { ...products[i], images };
    updated += 1;
    console.log(`Updated ${products[i].name}: ${images.length} photo(s)`);
  }

  if (!updated) throw new Error("No products matched — check slugs in CMS");

  const stored = asStoredProducts(products);
  await saveCmsSnapshot({ products: stored }, cms, { light: true });
  await writeFile(
    path.join(process.cwd(), "data", "cms-db.json"),
    `${JSON.stringify({ ...(await getCmsSnapshotForPatch()), products: stored }, null, 2)}\n`,
    "utf8",
  );

  console.log(`\nDone — ${updated} product(s) updated locally.`);
  console.log("Push live:");
  console.log("  node scripts/sync-cms.mjs push-product-images");
  console.log("  node scripts/push-uploads-http.mjs --sku-prefix STSRAJCT");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
