import type { Product } from "@/data/mock";

export function variantUnitPrice(product: Product, color: string | undefined, size: string) {
  const exactVariant = product.variants?.find((variant) => variant.size === size && (!color || variant.color === color));
  if (typeof exactVariant?.price === "number" && exactVariant.price > 0) return exactVariant.price;

  const sizeVariant = product.variants?.find((variant) => variant.size === size && typeof variant.price === "number" && variant.price > 0);
  if (sizeVariant) return sizeVariant.price;

  return product.price;
}

export function productSetPrice(product: Product, color: string | undefined, sizes: string[]) {
  const selectedSizes = sizes.length ? sizes : product.sizes;
  return selectedSizes.reduce((total, size) => total + variantUnitPrice(product, color, size), 0);
}

export function productDefaultSetPrice(product: Product) {
  return productSetPrice(product, product.colors[0], product.sizes);
}
