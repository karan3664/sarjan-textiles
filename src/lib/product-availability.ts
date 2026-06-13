import type { Product } from "@/data/mock";
import { FULL_SIZE_RUN } from "@/lib/cart-client";
import { availableSetsForSizeRun } from "@/lib/set-stock";

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

function variantStockTotal(
  variants: Product["variants"] | undefined,
): number | undefined {
  if (!variants?.length) return undefined;
  let total = 0;
  let hasValue = false;
  for (const variant of variants) {
    const n = Number(variant.stock);
    if (!Number.isFinite(n)) continue;
    hasValue = true;
    total += Math.max(0, n);
  }
  return hasValue ? total : undefined;
}

/** Admin inventory + catalog: parent stock, or sum of variant rows when variants carry stock. */
export function productInventoryOnHand(
  product: Pick<Product, "stock" | "variants">,
): number {
  const variantTotal = variantStockTotal(product.variants);
  if (variantTotal !== undefined) return variantTotal;
  return productStockOnHand(product) ?? 0;
}

export function productSizeRun(product: Pick<Product, "sizes">): string[] {
  return product.sizes?.length ? product.sizes : FULL_SIZE_RUN;
}

export function productReservedPieces(
  product: Pick<Product, "reserved">,
): number {
  const n = Number(product.reserved ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Sellable units after pending order reservations (matches `/api/orders` inventory check). */
export function productAvailablePieces(
  product: Pick<Product, "stock" | "reserved">,
): number | undefined {
  const onHand = productStockOnHand(product);
  if (onHand === undefined) return undefined;
  return Math.max(0, onHand - productReservedPieces(product));
}

/** True when sellable quantity is zero or negative. */
export function isProductSoldOut(
  product: Pick<Product, "stock" | "reserved">,
): boolean {
  const available = productAvailablePieces(product);
  if (available === undefined) return false;
  return available <= 0;
}

/** Storefront: show out-of-stock only to logged-in B2B visitors (guests see catalog without OOS). */
export function showProductSoldOutToViewer(
  product: Pick<Product, "stock" | "reserved">,
  viewerLoggedIn: boolean,
): boolean {
  if (!viewerLoggedIn) return false;
  return isProductSoldOut(product);
}

/** B2B carts may request above live stock — approval workflow handles shortfall. */
export const B2B_CART_MAX_SETS = 9999;

export function cartMaxSetQuantity(
  product: Pick<Product, "stock" | "reserved" | "moq" | "sizes" | "variants">,
  sizes: string[] = productSizeRun(product),
  capToAvailableStock = false,
  color?: string,
): number {
  const minSets = productWholesaleMinSets(product, sizes);
  if (!capToAvailableStock) {
    return Math.max(minSets, B2B_CART_MAX_SETS);
  }
  return Math.max(minSets, productMaxSets(product, sizes, color));
}

/** Minimum wholesale order quantity in full size sets (not pieces). */
export function productWholesaleMinSets(
  product: Pick<Product, "moq" | "sizes">,
  sizes: string[] = productSizeRun(product),
): number {
  const piecesPerSet = Math.max(1, sizes.length);
  return Math.max(1, Math.ceil(product.moq / piecesPerSet));
}

/** How many full sets can be ordered from available inventory (0 when sold out). */
export function productMaxSets(
  product: Pick<
    Product,
    | "stock"
    | "reserved"
    | "moq"
    | "sizes"
    | "variants"
    | "stockRegularSets"
    | "stockPlusSets"
  >,
  sizes: string[] = productSizeRun(product),
  color?: string,
): number {
  const setLimited = availableSetsForSizeRun(product, sizes, color);
  if (setLimited !== undefined) {
    return setLimited;
  }

  const available = productAvailablePieces(product);
  if (available === undefined) return 1;
  if (available <= 0) return 0;
  const piecesPerSet = Math.max(1, sizes.length);
  return Math.max(0, Math.floor(available / piecesPerSet));
}

/** Clamp requested set quantity to MOQ and live stock caps. */
export function clampCartSetQuantity(
  quantity: number,
  minSets: number,
  maxSets: number,
): number {
  if (maxSets <= 0) {
    return Math.max(1, quantity);
  }
  const min = Math.max(1, minSets);
  const max = Math.max(min, maxSets);
  return Math.min(Math.max(quantity, min), max);
}
