import type { Product } from "@/data/mock";
import type { StoredCartItem } from "@/lib/cart-client";
import {
  cartMaxSetQuantity,
  clampCartSetQuantity,
  productWholesaleMinSets,
} from "@/lib/product-availability";
import {
  type ClientTier,
  isProductPurchasable,
} from "@/lib/product-purchase-eligibility";

export function reconcileCartLineQuantity(
  item: StoredCartItem,
  product: Product,
): number {
  const maxSets = cartMaxSetQuantity(product, item.sizes, false);
  const minSets = productWholesaleMinSets(product, item.sizes);
  return clampCartSetQuantity(item.quantity, minSets, maxSets);
}

/** Informational only — B2B orders may proceed when sold out. */
export function cartLineSoldOut(
  _product: Product,
  _sizes: string[],
  _viewerLoggedIn: boolean,
): boolean {
  return false;
}

export function cartLineExceedsStock(
  product: Product,
  sizes: string[],
  quantity: number,
  viewerLoggedIn: boolean,
  color?: string,
): boolean {
  if (!viewerLoggedIn) return false;
  const maxSets = cartMaxSetQuantity(product, sizes, true, color);
  return maxSets > 0 && quantity > maxSets;
}

export function cartLineAvailableSets(
  product: Product,
  sizes: string[],
  color?: string,
): number {
  return cartMaxSetQuantity(product, sizes, true, color);
}

export type CartStockWarning = {
  slug: string;
  name: string;
  requestedSets: number;
  availableSets: number;
};

export function cartStockWarnings(
  lines: Array<{
    product: Product;
    quantity: number;
    sizes: string[];
    color?: string;
  }>,
  viewerLoggedIn: boolean,
): CartStockWarning[] {
  if (!viewerLoggedIn) return [];
  return lines
    .filter((line) =>
      cartLineExceedsStock(
        line.product,
        line.sizes,
        line.quantity,
        viewerLoggedIn,
        line.color,
      ),
    )
    .map((line) => ({
      slug: line.product.slug,
      name: line.product.name,
      requestedSets: line.quantity,
      availableSets: cartLineAvailableSets(
        line.product,
        line.sizes,
        line.color,
      ),
    }));
}

/** Blocks checkout only for catalog / tier restrictions — not stock shortfall. */
export function cartBlocksCheckout(
  lines: Array<{
    product: Product;
    quantity: number;
    sizes: string[];
  }>,
  viewerLoggedIn: boolean,
  clientTier: ClientTier = "standard",
): boolean {
  return lines.some(
    (line) => !isProductPurchasable(line.product, clientTier, viewerLoggedIn),
  );
}

export function cartHasAvailabilityIssues(
  lines: Array<{
    product: Product;
    quantity: number;
    sizes: string[];
  }>,
  viewerLoggedIn: boolean,
  clientTier: ClientTier = "standard",
): boolean {
  return cartBlocksCheckout(lines, viewerLoggedIn, clientTier);
}

/** @deprecated Use cartBlocksCheckout */
export function cartHasStockIssues(
  lines: Array<{
    product: Product;
    quantity: number;
    sizes: string[];
  }>,
  viewerLoggedIn: boolean,
): boolean {
  return cartHasAvailabilityIssues(lines, viewerLoggedIn);
}
