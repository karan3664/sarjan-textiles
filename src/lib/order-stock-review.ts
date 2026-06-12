import type { Product } from "@/data/mock";
import type { LocalOrder } from "@/lib/local-db";
import { productInventoryOnHand } from "@/lib/product-availability";

export type OrderLineStockReview = {
  slug: string;
  name: string;
  requestedPieces: number;
  availablePieces: number;
  shortfallPieces: number;
  exceedsStock: boolean;
};

export function orderLinePieces(item: {
  setQuantity: number;
  piecesPerSet?: number;
  sizes: string[];
  approvedSetQuantity?: number;
}): number {
  const sets = Math.max(
    0,
    Number(item.approvedSetQuantity ?? item.setQuantity) || 0,
  );
  const perSet = Math.max(1, item.piecesPerSet ?? item.sizes.length);
  return sets * perSet;
}

export function orderLineRequestedPieces(item: LocalOrder["items"][number]) {
  return orderLinePieces({ ...item, approvedSetQuantity: undefined });
}

export function productSellablePieces(
  product: Pick<Product, "stock" | "reserved" | "variants">,
) {
  const onHand = productInventoryOnHand(product);
  const reserved = Math.max(0, Number(product.reserved) || 0);
  return Math.max(0, onHand - reserved);
}

export function reviewOrderLineStock(
  product: Product | undefined,
  item: LocalOrder["items"][number],
): OrderLineStockReview {
  const requestedPieces = orderLineRequestedPieces(item);
  const availablePieces = product ? productSellablePieces(product) : 0;
  const shortfallPieces = Math.max(0, requestedPieces - availablePieces);
  return {
    slug: item.slug,
    name: item.name,
    requestedPieces,
    availablePieces,
    shortfallPieces,
    exceedsStock: shortfallPieces > 0,
  };
}

export function reviewOrderStock(
  items: LocalOrder["items"],
  productsBySlug: Map<string, Product>,
): OrderLineStockReview[] {
  return items.map((item) =>
    reviewOrderLineStock(productsBySlug.get(item.slug), item),
  );
}

export function orderExceedsAvailableStock(
  items: LocalOrder["items"],
  productsBySlug: Map<string, Product>,
): boolean {
  return reviewOrderStock(items, productsBySlug).some(
    (line) => line.exceedsStock,
  );
}

export function approvedPiecesForItem(
  item: LocalOrder["items"][number],
): number {
  if (item.approvedSetQuantity != null) {
    return orderLinePieces(item);
  }
  return orderLineRequestedPieces(item);
}

/** Approve up to available stock per line (admin partial approval). */
export function buildPartialApprovalItems(
  order: LocalOrder,
  products: Product[],
): LocalOrder["items"] {
  const stockLines = summarizeOrderStockLines(order, products);
  return order.items.map((item) => {
    const line = stockLines.find((row) => row.slug === item.slug);
    const perSet = Math.max(1, item.piecesPerSet ?? item.sizes.length);
    const maxSets = line
      ? Math.floor(line.availablePieces / perSet)
      : item.setQuantity;
    const approvedSetQuantity = Math.min(
      item.setQuantity,
      Math.max(0, maxSets),
    );
    return { ...item, approvedSetQuantity };
  });
}

/** Read-only summary for admin order stock review UI. */
export function summarizeOrderStockLines(
  order: LocalOrder,
  products: Product[],
) {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return order.items.map((item) => {
    const product = bySlug.get(item.slug);
    const requested = orderLineRequestedPieces(item);
    const available = product ? productSellablePieces(product) : 0;
    const approved = approvedPiecesForItem(item);
    const shortfall = Math.max(0, requested - available);
    return {
      slug: item.slug,
      name: item.name,
      requestedPieces: requested,
      availablePieces: available,
      shortfallPieces: shortfall,
      approvedPieces: approved,
      remainingPieces: Math.max(0, requested - approved),
    };
  });
}
