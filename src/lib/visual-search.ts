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
  garmentType?: string;
  source: "vision" | "color-fallback";
};

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

function scoreProduct(product: Product, terms: string[]) {
  let score = 0;
  const haystack = productHaystack(product);
  const name = readEnglish(product.name).toLowerCase();
  const category = readEnglish(product.category).toLowerCase();
  const fabric = readEnglish(product.fabric ?? "").toLowerCase();
  const colors = product.colors.map((c) => readEnglish(c).toLowerCase());

  for (const term of terms) {
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
            "You analyze wholesale Indian textile product photos for catalog search. Reply with JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Return {"keywords":["..."],"colors":["..."],"fabric":"...","category":"...","pattern":"...","garmentType":"..."}. keywords: 5-12 short English search terms (fabric, print, garment, color). colors: visible color names. Use common wholesale terms: kurta, saree, dupatta, cotton, silk, bandhani, ajrakh, block print, embroidery, etc.',
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
    };
    const keywords = uniqueTerms([
      ...(parsed.keywords ?? []),
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
    analysis.garmentType,
  ]);
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
  const terms = buildSearchTerms(analysis, textQuery);
  const { products } = await getCmsSnapshot();

  const scored = products
    .map((product) => ({ product, score: scoreProduct(product, terms) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  let items = scored.map((row) => row.product);

  if (!items.length && textQuery?.trim()) {
    const needle = textQuery.trim().toLowerCase();
    items = products.filter((product) =>
      productHaystack(product).includes(needle),
    );
  }

  if (!items.length) {
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
