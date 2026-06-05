import type { Product } from "@/data/mock";

/**
 * Normalizes `product.stock` from CMS JSON (number or numeric string).
 * Returns `undefined` when stock is missing so callers can fall back to legacy behaviour.
 */
export function productStockOnHand(
  product: Pick<Product, "stock">,
): number | undefined {
  const raw = product.stock as unknown;
  if (raw === null || raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** True when we have a finite stock quantity and it is zero or negative. */
export function isProductSoldOut(product: Pick<Product, "stock">): boolean {
  const qty = productStockOnHand(product);
  if (qty === undefined) return false;
  return qty <= 0;
}

/** Storefront: show out-of-stock only to logged-in B2B visitors (guests see catalog without OOS). */
export function showProductSoldOutToViewer(
  product: Pick<Product, "stock">,
  viewerLoggedIn: boolean,
): boolean {
  if (!viewerLoggedIn) return false;
  return isProductSoldOut(product);
}
