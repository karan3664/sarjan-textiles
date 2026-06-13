import { updateCmsProductsAtomically } from "@/lib/cms-store";
import type { Product } from "@/data/mock";
import type { LocalOrder } from "@/lib/local-db";
import {
  approvedPiecesForItem,
  productSellablePieces,
} from "@/lib/order-stock-review";

function applyPieces(
  products: Product[],
  slug: string,
  delta: { reserved?: number; stock?: number; sold?: number },
) {
  const index = products.findIndex((product) => product.slug === slug);
  if (index < 0) return;
  const product = { ...products[index] };
  if (delta.reserved)
    product.reserved = Math.max(0, (product.reserved ?? 0) + delta.reserved);
  if (delta.stock)
    product.stock = Math.max(0, (product.stock ?? 0) + delta.stock);
  if (delta.sold) product.sold = Math.max(0, (product.sold ?? 0) + delta.sold);
  products[index] = product;
}

function deductPiecesFromStock(
  products: Product[],
  slug: string,
  piecesRequested: number,
): number {
  const product = products.find((row) => row.slug === slug);
  if (!product || piecesRequested <= 0) return 0;
  const available = productSellablePieces(product);
  const deduct = Math.min(piecesRequested, available);
  if (deduct <= 0) return 0;
  applyPieces(products, slug, { stock: -deduct, sold: deduct });
  return deduct;
}

function restorePiecesToStock(
  products: Product[],
  slug: string,
  pieces: number,
) {
  if (pieces <= 0) return;
  applyPieces(products, slug, { stock: pieces, sold: -pieces });
}

async function mutateInventoryForApproval(order: LocalOrder) {
  await updateCmsProductsAtomically((products) => {
    for (const item of order.items) {
      const pieces = approvedPiecesForItem(item);
      deductPiecesFromStock(products, item.slug, pieces);
    }
    return products;
  });
}

async function mutateInventoryForRestore(order: LocalOrder) {
  await updateCmsProductsAtomically((products) => {
    for (const item of order.items) {
      const pieces = approvedPiecesForItem(item);
      restorePiecesToStock(products, item.slug, pieces);
    }
    return products;
  });
}

/** B2B: orders may exceed stock — placement never blocks or reserves inventory. */
export async function assertInventoryAvailableForOrder(_order: LocalOrder) {
  return;
}

/** @deprecated B2B workflow — inventory is not reserved at placement. */
export async function reserveInventoryForOrder(_order: LocalOrder) {
  return;
}

/** @deprecated B2B workflow — nothing reserved at placement. */
export async function releaseInventoryForOrder(_order: LocalOrder) {
  return;
}

export async function deductInventoryForOrder(order: LocalOrder) {
  await mutateInventoryForApproval(order);
}

export async function restoreInventoryForOrder(order: LocalOrder) {
  await mutateInventoryForRestore(order);
}

const INVENTORY_ACTIVE_STATUSES: LocalOrder["status"][] = [
  "Approved",
  "Partially Approved",
];

export async function syncInventoryForOrderStatusChange(
  order: LocalOrder,
  previousStatus: LocalOrder["status"],
  nextStatus: LocalOrder["status"],
) {
  if (previousStatus === nextStatus) return;

  if (nextStatus === "Rejected") {
    if (INVENTORY_ACTIVE_STATUSES.includes(previousStatus)) {
      await restoreInventoryForOrder(order);
    }
    return;
  }

  if (
    INVENTORY_ACTIVE_STATUSES.includes(nextStatus) &&
    previousStatus === "Pending approval"
  ) {
    await deductInventoryForOrder(order);
  }
}
