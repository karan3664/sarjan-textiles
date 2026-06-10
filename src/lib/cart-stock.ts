import type { Product } from "@/data/mock";
import type { StoredCartItem } from "@/lib/cart-client";
import {
  clampCartSetQuantity,
  productMaxSets,
  productWholesaleMinSets,
  showProductSoldOutToViewer,
} from "@/lib/product-availability";

export function reconcileCartLineQuantity(
  item: StoredCartItem,
  product: Product,
): number {
  const maxSets = productMaxSets(product, item.sizes);
  const minSets = productWholesaleMinSets(product, item.sizes);
  return clampCartSetQuantity(item.quantity, minSets, maxSets);
}

export function cartLineSoldOut(
  product: Product,
  sizes: string[],
  viewerLoggedIn: boolean,
): boolean {
  if (!viewerLoggedIn) return false;
  return productMaxSets(product, sizes) <= 0;
}

export function cartLineExceedsStock(
  product: Product,
  sizes: string[],
  quantity: number,
  viewerLoggedIn: boolean,
): boolean {
  if (!viewerLoggedIn) return false;
  const maxSets = productMaxSets(product, sizes);
  return maxSets > 0 && quantity > maxSets;
}

export function cartHasStockIssues(
  lines: Array<{
    product: Product;
    quantity: number;
    sizes: string[];
  }>,
  viewerLoggedIn: boolean,
): boolean {
  if (!viewerLoggedIn) return false;
  return lines.some(
    (line) =>
      showProductSoldOutToViewer(line.product, true) ||
      cartLineExceedsStock(
        line.product,
        line.sizes,
        line.quantity,
        viewerLoggedIn,
      ),
  );
}
