import assert from "node:assert/strict";
import sharp from "sharp";
import type { Product } from "../src/data/mock";
import {
  buildSearchTerms,
  expandPrimaryTypesForSearch,
  inferPrimaryProductTypes,
  scoreProduct,
  analyzeSearchImage,
  shouldRestrictToAccessoryCatalog,
} from "../src/lib/visual-search";

function mockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "test-kurta",
    slug: "test-kurta",
    sku: "TK-001",
    name: { en: "Bandhani Maroon Kurta" },
    category: { en: "Kurtas" },
    fabric: { en: "Cotton" },
    description: { en: "Hand block print kurta" },
    colors: [{ en: "Maroon" }, { en: "Red" }],
    sizes: ["M", "L", "XL"],
    moq: 25,
    images: [],
    ...overrides,
  } as Product;
}

async function run() {
  const analysis = {
    keywords: ["bandhani", "kurta", "cotton"],
    colors: ["maroon"],
    pattern: "bandhani",
    category: "Kurtas",
    source: "vision" as const,
  };

  const terms = buildSearchTerms(analysis, "maroon kurta");
  assert.ok(terms.includes("bandhani"));
  assert.ok(terms.includes("maroon"));
  assert.ok(terms.includes("kurta"));

  const product = mockProduct();
  const score = scoreProduct(product, terms);
  assert.ok(score > 0, "matching product should score > 0");

  const weak = scoreProduct(
    mockProduct({
      slug: "plain-shirt",
      name: { en: "Plain White Shirt" },
      category: { en: "Shirts" },
      colors: [{ en: "White" }],
    }),
    ["bandhani", "maroon"],
  );
  assert.equal(weak, 0, "non-matching product should score 0");

  const clutchAnalysis = {
    keywords: ["clutch", "geometric", "block print", "cotton", "accessories"],
    colors: ["blue", "red"],
    pattern: "geometric",
    category: "accessories",
    productType: "clutch",
    source: "vision" as const,
  };
  const clutchTerms = buildSearchTerms(clutchAnalysis);
  const primaryTypes = inferPrimaryProductTypes(clutchAnalysis);
  assert.deepEqual(primaryTypes, ["clutch", "accessories"]);

  const clutchProduct = mockProduct({
    slug: "ladies-embroidered-clutch",
    name: { en: "Ladies Embroidered Clutch — Assorted Designs" },
    category: { en: "Women's Clutch" },
    fabric: { en: "Cotton" },
    colors: [{ en: "Assorted" }],
  });
  const kurtaProduct = mockProduct({
    slug: "ajrakh-kurta",
    name: { en: "Ajrakh Chowkdi Cotton Printed Kurta" },
    category: { en: "Men's Cotton Kurta" },
    fabric: { en: "Cotton" },
    colors: [{ en: "Blue" }],
    description: { en: "Geometric ajrakh block print kurta" },
  });

  const clutchScore = scoreProduct(clutchProduct, clutchTerms, {
    primaryTypes,
  });
  const kurtaScore = scoreProduct(kurtaProduct, clutchTerms, {
    primaryTypes,
  });
  assert.ok(
    clutchScore > kurtaScore,
    `clutch (${clutchScore}) should outrank kurta (${kurtaScore}) for clutch photo analysis`,
  );

  const accessoryOnlyAnalysis = {
    keywords: ["geometric", "blue", "accessories", "block print", "cotton"],
    colors: ["blue", "red"],
    pattern: "geometric",
    category: "accessories",
    source: "vision" as const,
  };
  const accessoryTypes = expandPrimaryTypesForSearch(
    inferPrimaryProductTypes(accessoryOnlyAnalysis),
  );
  assert.ok(accessoryTypes.includes("clutch"));
  assert.ok(shouldRestrictToAccessoryCatalog(accessoryTypes));
  const accessoryTerms = buildSearchTerms(accessoryOnlyAnalysis);
  const accessoryClutchScore = scoreProduct(clutchProduct, accessoryTerms, {
    primaryTypes: accessoryTypes,
  });
  const accessoryKurtaScore = scoreProduct(kurtaProduct, accessoryTerms, {
    primaryTypes: accessoryTypes,
  });
  assert.ok(
    accessoryClutchScore > accessoryKurtaScore,
    "accessories-only vision should prefer clutch over kurta",
  );

  const shirtAnalysis = {
    keywords: ["striped", "ajrakh", "shirt", "cotton", "block print"],
    colors: ["blue", "green"],
    pattern: "striped",
    productType: "shirt",
    category: "shirt",
    source: "vision" as const,
  };
  const shirtTypes = expandPrimaryTypesForSearch(
    inferPrimaryProductTypes(shirtAnalysis),
  );
  assert.ok(!shouldRestrictToAccessoryCatalog(shirtTypes));
  const shirtScore = scoreProduct(
    kurtaProduct,
    buildSearchTerms(shirtAnalysis),
    {
      primaryTypes: shirtTypes,
    },
  );
  assert.ok(shirtScore > 0, "shirt analysis should match apparel");

  const redBuffer = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 200, g: 40, b: 40 },
    },
  })
    .jpeg()
    .toBuffer();

  const fallback = await analyzeSearchImage(redBuffer, "image/jpeg");
  assert.ok(fallback.colors.length >= 1);
  assert.ok(
    fallback.source === "vision" || fallback.source === "color-fallback",
  );

  console.log("test-visual-search: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
