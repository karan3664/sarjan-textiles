import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");

// Dynamic import TS modules
const { resolveProduct } = await import(`${root}/src/lib/product-localize.ts`);
const { productColorGalleryForProduct, visibleProductColors } = await import(
  `${root}/src/lib/product-colors.ts`
);

const db = JSON.parse(readFileSync(`${root}/data/cms-db.json`, "utf8"));
const products = db.products.filter((p) => (p.images?.length ?? 0) >= 2);

const MENS_MAP = {
  indigo: "indigo",
  maroon: "black",
  black: "cream",
  yellow: "yellow",
  cream: "maroon",
};

function folderFromUrl(url) {
  return url
    ?.toLowerCase()
    .match(
      /\/(indigo|maroon|cream|black|yellow|navy|white|offwhite|ivory|assorted)\//,
    )?.[1];
}

function colorToken(color) {
  return color.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const issues = [];

for (const raw of products) {
  const product = resolveProduct(raw, "en");
  const colors = visibleProductColors(product);
  const gallery = productColorGalleryForProduct(product);
  const isMens = /^STSRAJCT/.test((raw.sku ?? "").toUpperCase());
  const bad = [];

  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    const folder = folderFromUrl(gallery[i]);
    const token = colorToken(color);
    const expected = isMens ? MENS_MAP[token] : token;
    const aliases = {
      cream: ["cream", "white", "offwhite", "ivory"],
      indigo: ["indigo", "navy"],
      navy: ["indigo", "navy"],
    };
    const acceptable = isMens ? [expected] : (aliases[token] ?? [token]);
    const ok = folder && acceptable.some((t) => folder === t);
    if (!ok) {
      bad.push({ i, color, folder: folder ?? "NONE", url: gallery[i] });
    }
  }

  if (bad.length) {
    issues.push({ sku: raw.sku, slug: raw.slug, bad });
  }
}

console.log("Products checked:", products.length);
console.log("Products with issues:", issues.length);
for (const row of issues) {
  console.log(`\n${row.sku} | ${row.slug}`);
  for (const b of row.bad) {
    console.log(`  [${b.i}] ${b.color} -> ${b.folder}`);
  }
}

const kaftan = db.products.find(
  (p) => p.slug === "ajrakh-stripes-modal-ajrakh-kaftan-shirt",
);
if (kaftan) {
  const p = resolveProduct(kaftan, "en");
  console.log("\n=== KAFTAN DETAIL ===");
  visibleProductColors(p).forEach((c, i) => {
    console.log(i, c, "->", folderFromUrl(productColorGalleryForProduct(p)[i]));
  });
}
