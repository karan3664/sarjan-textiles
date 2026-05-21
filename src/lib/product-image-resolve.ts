import type { Product } from "@/data/mock";

/** Slug (+ legacy slugs) → first product image path/URL. */
export function buildProductImageBySlug(
  products: Pick<Product, "slug" | "legacySlugs" | "images">[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const product of products) {
    const image = product.images?.[0]?.trim() ?? "";
    if (!image) continue;
    map[product.slug] = image;
    for (const legacy of product.legacySlugs ?? []) {
      if (legacy.trim()) map[legacy.trim()] = image;
    }
  }
  return map;
}

export function resolveOrderItemImage(
  imageBySlug: Record<string, string>,
  item: { slug?: string; name?: string; image?: string },
): string {
  const stored = item.image?.trim() ?? "";
  if (stored) return stored;
  const slug = item.slug?.trim() ?? "";
  if (slug && imageBySlug[slug]) return imageBySlug[slug];
  return "";
}
