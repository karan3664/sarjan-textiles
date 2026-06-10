import type { Product } from "@/data/mock";
import { applyClientPricing, sortProductList } from "@/lib/catalog";
import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { readEnglish } from "@/lib/cms-localize";
import type { AppLocale } from "@/lib/localized-text";
import { clientHasOrderHistory } from "@/lib/client-order-history";
import { readLocalDb } from "@/lib/local-db";
import { applyProductDeals } from "@/lib/product-deal";
import { productStockOnHand } from "@/lib/product-availability";
import { resolveProducts } from "@/lib/product-localize";

const DEFAULT_LIMIT = 12;

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export function productReferenceKeys(product: Product) {
  const keys = new Set<string>();
  [product.id, product.slug, product.sku, ...(product.legacySlugs ?? [])]
    .filter(Boolean)
    .forEach((key) => keys.add(normalizeKey(key)));
  return keys;
}

export function findCatalogProduct(products: Product[], ref: string) {
  const wanted = normalizeKey(ref);
  return products.find((product) => productReferenceKeys(product).has(wanted));
}

function colorSet(product: Product) {
  return new Set(
    product.colors.map((color) => normalizeKey(readEnglish(color))),
  );
}

export function scoreSimilarProduct(current: Product, candidate: Product) {
  if (current.id === candidate.id || current.slug === candidate.slug) {
    return -1;
  }

  let score = 0;
  const currentCategory = normalizeKey(readEnglish(current.category));
  const candidateCategory = normalizeKey(readEnglish(candidate.category));
  if (currentCategory && currentCategory === candidateCategory) {
    score += 50;
  }

  const currentFabric = normalizeKey(readEnglish(current.fabric));
  const candidateFabric = normalizeKey(readEnglish(candidate.fabric));
  if (currentFabric && candidateFabric && currentFabric === candidateFabric) {
    score += 25;
  }

  const sharedColors = colorSet(current);
  candidate.colors.forEach((color) => {
    if (sharedColors.has(normalizeKey(readEnglish(color)))) {
      score += 5;
    }
  });

  if (current.price > 0 && candidate.price > 0) {
    const delta = Math.abs(current.price - candidate.price) / current.price;
    if (delta <= 0.2) score += 10;
    else if (delta <= 0.35) score += 4;
  }

  score += Math.min(Math.floor(candidate.sold / 8), 15);
  if ((productStockOnHand(candidate) ?? 0) > 0) score += 5;
  if (candidate.isFeatured) score += 4;

  return score;
}

function buildSimilarProducts(
  current: Product,
  products: Product[],
  limit: number,
) {
  return products
    .map((candidate) => ({
      candidate,
      score: scoreSimilarProduct(current, candidate),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.candidate.sold - a.candidate.sold ||
        a.candidate.name.localeCompare(b.candidate.name),
    )
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

async function coOccurrenceCounts(current: Product) {
  const db = await readLocalDb();
  const currentKeys = productReferenceKeys(current);
  const counts = new Map<string, number>();

  db.orders.forEach((order) => {
    const slugs = order.items.map((item) => normalizeKey(item.slug));
    if (!slugs.some((slug) => currentKeys.has(slug))) return;
    slugs.forEach((slug) => {
      if (currentKeys.has(slug)) return;
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    });
  });

  return counts;
}

function complementaryCategoryFallback(current: Product, products: Product[]) {
  const currentCategory = normalizeKey(readEnglish(current.category));
  const currentFabric = normalizeKey(readEnglish(current.fabric));

  return sortProductList(
    products.filter((product) => {
      if (product.id === current.id || product.slug === current.slug) {
        return false;
      }
      const category = normalizeKey(readEnglish(product.category));
      const fabric = normalizeKey(readEnglish(product.fabric));
      if (category && category !== currentCategory) return true;
      if (fabric && fabric !== currentFabric) return true;
      return false;
    }),
    "best-selling",
  );
}

function buildBoughtTogetherProducts(
  current: Product,
  products: Product[],
  counts: Map<string, number>,
  limit: number,
) {
  const currentKeys = productReferenceKeys(current);
  const bySlug = new Map(
    products.flatMap((product) => {
      const keys = productReferenceKeys(product);
      return [...keys].map((key) => [key, product] as const);
    }),
  );

  const rankedFromOrders = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => bySlug.get(slug))
    .filter((product): product is Product => Boolean(product))
    .filter(
      (product, index, list) =>
        list.findIndex((item) => item.id === product.id) === index,
    )
    .filter((product) => !currentKeys.has(normalizeKey(product.slug)));

  if (rankedFromOrders.length >= Math.min(3, limit)) {
    return rankedFromOrders.slice(0, limit);
  }

  const used = new Set(rankedFromOrders.map((product) => product.id));
  const fallback = complementaryCategoryFallback(current, products).filter(
    (product) => !used.has(product.id),
  );

  return [...rankedFromOrders, ...fallback].slice(0, limit);
}

export async function getProductRecommendations({
  ref,
  locale = "en",
  clientId,
  limit = DEFAULT_LIMIT,
}: {
  ref: string;
  locale?: AppLocale;
  clientId?: string | null;
  limit?: number;
}) {
  const { products: rawProducts } = await getLocalizedCmsSnapshot();
  const current = findCatalogProduct(rawProducts, ref);
  if (!current) {
    return { similar: [] as Product[], boughtTogether: [] as Product[] };
  }

  const localized = applyProductDeals(resolveProducts(rawProducts, locale));
  const similar = buildSimilarProducts(current, localized, limit);
  const hasOrderHistory = await clientHasOrderHistory(clientId);
  const counts = hasOrderHistory
    ? await coOccurrenceCounts(current)
    : new Map();
  const boughtTogether = hasOrderHistory
    ? buildBoughtTogetherProducts(current, localized, counts, limit)
    : [];

  const [pricedSimilar, pricedBoughtTogether] = await Promise.all([
    applyClientPricing(similar, clientId),
    applyClientPricing(boughtTogether, clientId),
  ]);

  return {
    similar: pricedSimilar,
    boughtTogether: pricedBoughtTogether,
    hasOrderHistory,
    source: {
      boughtTogetherFromOrders: counts.size > 0,
    },
  };
}
