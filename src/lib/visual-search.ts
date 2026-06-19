import sharp from "sharp";
import type { Product } from "@/data/mock";
import { getCmsSnapshot } from "@/lib/cms-store";
import { readEnglish } from "@/lib/cms-localize";
import { applyClientPricing } from "@/lib/catalog";
import { resolveProducts } from "@/lib/product-localize";
import type { AppLocale } from "@/lib/localized-text";
import { resolveOpenAiApiKey } from "@/lib/order-bot/openai-env";

export type VisualSearchAnalysis = {
  keywords: string[];
  colors: string[];
  fabric?: string;
  category?: string;
  pattern?: string;
  /** @deprecated prefer productType */
  garmentType?: string;
  /** Primary catalog item type: clutch, kurta, saree, bag, etc. */
  productType?: string;
  source: "vision" | "color-fallback";
};

/** Wholesale product-type tokens (accessories + apparel). */
const PRODUCT_TYPE_ALIASES: Record<string, string[]> = {
  clutch: ["clutch", "potli", "evening bag"],
  bag: ["bag", "handbag", "tote", "sling bag"],
  wallet: ["wallet", "pouch", "coin purse"],
  accessories: ["accessory", "accessories"],
  kurta: ["kurta", "kurti", "kurtas"],
  shirt: ["shirt", "shirts", "top", "tops", "blouse", "tunic", "tunics"],
  saree: ["saree", "sari", "sarees"],
  dupatta: ["dupatta", "stole", "scarf"],
  dress: ["dress", "gown", "kaftan", "kaftans"],
  lehenga: ["lehenga", "skirt"],
};

const APPAREL_TYPE_KEYS = new Set([
  "kurta",
  "shirt",
  "saree",
  "dupatta",
  "dress",
  "lehenga",
]);

const ACCESSORY_TYPE_KEYS = new Set(["clutch", "bag", "wallet", "accessories"]);

function normalizeTypeKey(raw: string) {
  const term = raw.trim().toLowerCase();
  for (const [key, aliases] of Object.entries(PRODUCT_TYPE_ALIASES)) {
    if (key === term || aliases.some((alias) => term.includes(alias))) {
      return key;
    }
  }
  return null;
}

export function inferPrimaryProductTypes(analysis: VisualSearchAnalysis) {
  const seen = new Set<string>();
  const out: string[] = [];
  const candidates = [
    analysis.productType,
    analysis.garmentType,
    analysis.category,
    ...analysis.keywords,
  ];
  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const key = normalizeTypeKey(raw);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/** When vision says "accessories", also search clutch/bag/wallet SKUs. */
export function expandPrimaryTypesForSearch(types: string[]) {
  const expanded = new Set(types);
  if (expanded.has("accessories")) {
    expanded.add("clutch");
    expanded.add("bag");
    expanded.add("wallet");
  }
  return [...expanded];
}

export function shouldRestrictToAccessoryCatalog(types: string[]) {
  const hasAccessory = types.some((type) => ACCESSORY_TYPE_KEYS.has(type));
  const hasApparel = types.some((type) => APPAREL_TYPE_KEYS.has(type));
  return hasAccessory && !hasApparel;
}

function productMatchesAccessoryCatalog(product: Product) {
  const keys = productTypeKeysForProduct(product);
  return [...keys].some((type) => ACCESSORY_TYPE_KEYS.has(type));
}

function productTypeKeysForProduct(product: Product) {
  const haystack = productHaystack(product);
  const keys = new Set<string>();
  for (const [key, aliases] of Object.entries(PRODUCT_TYPE_ALIASES)) {
    if (aliases.some((alias) => haystack.includes(alias))) {
      keys.add(key);
    }
  }
  return keys;
}

function isAccessoryAnalysis(types: string[]) {
  return types.some((type) => ACCESSORY_TYPE_KEYS.has(type));
}

function isApparelAnalysis(types: string[]) {
  return types.some((type) => APPAREL_TYPE_KEYS.has(type));
}

function productHaystack(product: Product) {
  return [
    readEnglish(product.name),
    product.slug,
    product.sku,
    readEnglish(product.category),
    readEnglish(product.fabric),
    readEnglish(product.description),
    ...(product.categoryPath ?? []).map((part) => readEnglish(part)),
    readEnglish(product.categoryLevel1),
    readEnglish(product.categoryLevel2),
    readEnglish(product.categoryLevel3),
    ...product.colors.map((color) => readEnglish(color)),
    ...product.sizes,
    readEnglish(product.keywords),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function uniqueTerms(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const term = raw?.trim().toLowerCase();
    if (!term || term.length < 2 || seen.has(term)) continue;
    seen.add(term);
    out.push(term);
  }
  return out;
}

export function scoreProduct(
  product: Product,
  terms: string[],
  options?: { primaryTypes?: string[] },
) {
  let score = 0;
  const haystack = productHaystack(product);
  const name = readEnglish(product.name).toLowerCase();
  const category = readEnglish(product.category).toLowerCase();
  const fabric = readEnglish(product.fabric ?? "").toLowerCase();
  const colors = product.colors.map((c) => readEnglish(c).toLowerCase());
  const productTypes = productTypeKeysForProduct(product);
  const primaryTypes = options?.primaryTypes ?? [];

  for (const type of primaryTypes) {
    const aliases = PRODUCT_TYPE_ALIASES[type] ?? [type];
    for (const alias of aliases) {
      if (name.includes(alias)) score += 30;
      if (category.includes(alias)) score += 24;
      if (haystack.includes(alias)) score += 12;
    }
    if (productTypes.has(type)) score += 28;
  }

  if (primaryTypes.length) {
    const accessoryQuery = isAccessoryAnalysis(primaryTypes);
    const apparelQuery = isApparelAnalysis(primaryTypes);
    const productIsAccessory = [...productTypes].some((type) =>
      ACCESSORY_TYPE_KEYS.has(type),
    );
    const productIsApparel = [...productTypes].some((type) =>
      APPAREL_TYPE_KEYS.has(type),
    );
    if (accessoryQuery && productIsApparel && !productIsAccessory) score -= 40;
    if (apparelQuery && productIsAccessory && !productIsApparel) score -= 40;
  }

  for (const term of terms) {
    if (
      primaryTypes.some((type) => PRODUCT_TYPE_ALIASES[type]?.includes(term))
    ) {
      continue;
    }
    if (name.includes(term)) score += 8;
    if (category.includes(term)) score += 6;
    if (fabric.includes(term)) score += 5;
    if (colors.some((c) => c.includes(term) || term.includes(c))) score += 4;
    if (haystack.includes(term)) score += 2;
  }
  return score;
}

async function analyzeWithOpenAi(
  buffer: Buffer,
  mime: string,
): Promise<VisualSearchAnalysis | null> {
  const key = resolveOpenAiApiKey();
  if (!key) return null;

  const resized = await sharp(buffer)
    .rotate()
    .resize({
      width: 768,
      height: 768,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82 })
    .toBuffer();
  const base64 = resized.toString("base64");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.VISUAL_SEARCH_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 320,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You analyze wholesale Indian textile product photos for B2B catalog search. Identify the physical product type first (clutch, bag, wallet, potli, kurta, shirt, saree, dupatta, dress, etc.), then fabric, print, and colors. Reply with JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Return {"keywords":["..."],"colors":["..."],"fabric":"...","category":"...","pattern":"...","productType":"...","garmentType":"..."}. productType: one primary item (clutch, handbag, wallet, potli, kurta, shirt, tunic, saree, dupatta, dress, accessories, etc.). keywords: 5-12 short English search terms — include product type first, then fabric/print/color. If a person is wearing the item, productType must be the garment (shirt, kurta, tunic, dress) — not accessories. For flat rectangular fabric items without sleeves or a model, prefer clutch/wallet/potli over kurta/shirt unless clearly apparel. colors: visible color names.',
            },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return null;

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = payload.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      keywords?: string[];
      colors?: string[];
      fabric?: string;
      category?: string;
      pattern?: string;
      garmentType?: string;
      productType?: string;
    };
    const keywords = uniqueTerms([
      ...(parsed.keywords ?? []),
      parsed.productType,
      parsed.fabric,
      parsed.category,
      parsed.pattern,
      parsed.garmentType,
    ]);
    const colors = uniqueTerms(parsed.colors ?? []);
    if (!keywords.length && !colors.length) return null;
    return {
      keywords,
      colors,
      fabric: parsed.fabric?.trim(),
      category: parsed.category?.trim(),
      pattern: parsed.pattern?.trim(),
      garmentType: parsed.garmentType?.trim(),
      productType: parsed.productType?.trim() || parsed.garmentType?.trim(),
      source: "vision",
    };
  } catch {
    return null;
  }
}

function rgbToColorName(r: number, g: number, b: number) {
  const palette: Array<{ name: string; rgb: [number, number, number] }> = [
    { name: "red", rgb: [220, 50, 50] },
    { name: "maroon", rgb: [128, 0, 32] },
    { name: "blue", rgb: [40, 90, 200] },
    { name: "navy", rgb: [20, 40, 90] },
    { name: "green", rgb: [40, 140, 70] },
    { name: "yellow", rgb: [230, 200, 40] },
    { name: "gold", rgb: [200, 160, 60] },
    { name: "orange", rgb: [230, 120, 40] },
    { name: "pink", rgb: [230, 120, 160] },
    { name: "purple", rgb: [120, 60, 160] },
    { name: "black", rgb: [30, 30, 30] },
    { name: "white", rgb: [240, 240, 240] },
    { name: "grey", rgb: [130, 130, 130] },
    { name: "beige", rgb: [210, 190, 150] },
    { name: "brown", rgb: [120, 80, 50] },
    { name: "cream", rgb: [245, 235, 210] },
  ];
  let best = palette[0];
  let bestDist = Number.MAX_SAFE_INTEGER;
  for (const entry of palette) {
    const [pr, pg, pb] = entry.rgb;
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }
  return best.name;
}

async function analyzeWithColorFallback(
  buffer: Buffer,
): Promise<VisualSearchAnalysis> {
  const { dominant } = await sharp(buffer)
    .rotate()
    .resize(96, 96, { fit: "cover" })
    .stats();
  const color = rgbToColorName(
    Math.round(dominant.r),
    Math.round(dominant.g),
    Math.round(dominant.b),
  );
  return {
    keywords: [color, "textile", "fabric"],
    colors: [color],
    source: "color-fallback",
  };
}

export async function analyzeSearchImage(
  buffer: Buffer,
  mime: string,
): Promise<VisualSearchAnalysis> {
  const vision = await analyzeWithOpenAi(buffer, mime);
  if (vision) return vision;
  return analyzeWithColorFallback(buffer);
}

export function buildSearchTerms(
  analysis: VisualSearchAnalysis,
  textQuery?: string,
) {
  const textParts = textQuery
    ?.split(/[\s,+/]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  return uniqueTerms([
    ...(textParts ?? []),
    ...analysis.keywords,
    ...analysis.colors,
    analysis.fabric,
    analysis.category,
    analysis.pattern,
    analysis.productType,
    analysis.garmentType,
  ]);
}

function typeSearchTerms(primaryTypes: string[]) {
  const terms: string[] = [];
  for (const type of primaryTypes) {
    terms.push(type, ...(PRODUCT_TYPE_ALIASES[type] ?? []));
  }
  return uniqueTerms(terms);
}

export async function searchProductsByImage({
  imageBuffer,
  mime,
  textQuery,
  clientId,
  limit = 24,
  locale = "en",
}: {
  imageBuffer: Buffer;
  mime: string;
  textQuery?: string;
  clientId?: string | null;
  limit?: number;
  locale?: AppLocale;
}) {
  const analysis = await analyzeSearchImage(imageBuffer, mime);
  const primaryTypes = expandPrimaryTypesForSearch(
    inferPrimaryProductTypes(analysis),
  );
  const restrictAccessories = shouldRestrictToAccessoryCatalog(primaryTypes);
  const terms = buildSearchTerms(analysis, textQuery);
  const { products } = await getCmsSnapshot();

  const scoreOptions = { primaryTypes };
  let scored = products
    .map((product) => ({
      product,
      score: scoreProduct(product, terms, scoreOptions),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (primaryTypes.length) {
    const typeTerms = typeSearchTerms(primaryTypes);
    const typeMatches = products
      .filter((product) => {
        if (restrictAccessories && !productMatchesAccessoryCatalog(product)) {
          return false;
        }
        const haystack = productHaystack(product);
        const keys = productTypeKeysForProduct(product);
        return (
          primaryTypes.some((type) => keys.has(type)) ||
          typeTerms.some((term) => haystack.includes(term))
        );
      })
      .map((product) => ({
        product,
        score: scoreProduct(product, terms, scoreOptions),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);

    if (typeMatches.length) {
      scored = typeMatches;
    } else if (restrictAccessories) {
      scored = products
        .filter((product) => productMatchesAccessoryCatalog(product))
        .map((product) => ({
          product,
          score: scoreProduct(product, terms, scoreOptions),
        }))
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score);
    }
  }

  if (restrictAccessories) {
    scored = scored.filter((row) =>
      productMatchesAccessoryCatalog(row.product),
    );
  }

  let items = scored.map((row) => row.product);

  if (!items.length && textQuery?.trim()) {
    const needle = textQuery.trim().toLowerCase();
    items = products.filter((product) => {
      if (restrictAccessories && !productMatchesAccessoryCatalog(product)) {
        return false;
      }
      return productHaystack(product).includes(needle);
    });
  }

  if (!items.length && !restrictAccessories) {
    items = products.filter((product) =>
      analysis.colors.some((color) =>
        product.colors.some((c) =>
          readEnglish(c).toLowerCase().includes(color),
        ),
      ),
    );
  }

  const priced = await applyClientPricing(
    resolveProducts(items.slice(0, limit), locale),
    clientId,
  );
  return {
    analysis,
    terms,
    items: priced,
    total: items.length,
  };
}
