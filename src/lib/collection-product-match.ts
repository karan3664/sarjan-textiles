import type { Product } from "@/data/mock";
import { readEnglish } from "@/lib/cms-localize";
import { COLLECTION_ROUTES } from "@/lib/collection-route-defaults";
import { productMatchesCategoryFilter } from "@/lib/product-category-filter";

/** Product fields used for collection matching (not full description — avoids false positives). */
export function collectionMatchHaystack(
  product: Product,
  includeDescription = false,
): string {
  const parts = [
    readEnglish(product.name as string),
    readEnglish(product.category as string),
    product.sku,
    product.slug,
    readEnglish(product.fabric as string),
    ...(product.categoryPath ?? []).map((value) =>
      readEnglish(value as string),
    ),
    product.categoryLevel1 ? readEnglish(product.categoryLevel1 as string) : "",
    product.categoryLevel2 ? readEnglish(product.categoryLevel2 as string) : "",
    product.categoryLevel3 ? readEnglish(product.categoryLevel3 as string) : "",
  ];
  if (includeDescription) {
    parts.push(readEnglish(product.description as string));
  }
  return parts.join(" ").toLowerCase();
}

/** True when a product belongs to a curated /collections/[slug] page. */
export function productMatchesCollectionSlug(
  product: Product,
  slug: string,
): boolean {
  const key = slug.trim().toLowerCase();
  if (!key) return true;

  const hay = collectionMatchHaystack(product);

  if (key === "ajrakh") {
    return /ajrakh|ajrak/.test(hay);
  }
  if (key === "mashru") {
    return /mashru/.test(hay);
  }
  if (key === "block-print") {
    return /block print|block-print|bagru/.test(hay);
  }
  if (key === "kaftan-shirts") {
    return /kaftan/.test(hay);
  }

  const route = COLLECTION_ROUTES.find((entry) => entry.slug === key);
  if (route?.filters?.category) {
    const categoryFilter = route.filters.category;
    if (categoryFilter !== "men" && categoryFilter !== "women") {
      return productMatchesCategoryFilter(product, categoryFilter);
    }
  }

  if (route?.q) {
    const token = route.q.toLowerCase();
    return hay.includes(token);
  }

  return hay.includes(key.replace(/-/g, " "));
}

export function isKnownCollectionSlug(slug: string): boolean {
  return COLLECTION_ROUTES.some((route) => route.slug === slug);
}
