import type { Product } from "@/data/mock";

export function firstProductImage(
  product?: Pick<Product, "images"> | null,
): string {
  return product?.images?.[0]?.trim() ?? "";
}

export function firstProductImageFromItems(
  items: Pick<Product, "images">[],
): string {
  for (const item of items) {
    const url = firstProductImage(item);
    if (url) return url;
  }
  return "";
}
