import { siteUrl } from "@/lib/seo";

const FILTER_KEYS = [
  "page",
  "sort",
  "q",
  "category",
  "fabric",
  "color",
  "size",
  "stock",
  "minPrice",
  "maxPrice",
] as const;

export type ProductListingSearch = Partial<
  Record<(typeof FILTER_KEYS)[number], string | undefined>
>;

/** Stable canonical URL for filtered PLP (sorted query keys, drops empties). */
export function productsListingCanonical(search: ProductListingSearch) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = search[key]?.trim();
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${siteUrl}/products?${qs}` : `${siteUrl}/products`;
}
