import type { Product } from "@/data/mock";

const bySlug = new Map<string, Product>();

export function cacheCatalogProducts(products: Product[]) {
  for (const product of products) bySlug.set(product.slug, product);
}

export function slugsMissingFromCache(slugs: string[]) {
  return slugs.filter((slug) => !bySlug.has(slug));
}

export function getCachedProducts(slugs: string[]): Product[] {
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((product): product is Product => Boolean(product));
}
