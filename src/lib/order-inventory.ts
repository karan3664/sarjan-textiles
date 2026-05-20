import { getCmsSnapshot, saveCmsSnapshot } from "@/lib/cms-store";
import type { Product } from "@/data/mock";
import type { LocalOrder } from "@/lib/local-db";

function pieceCount(item: LocalOrder["items"][number]) {
  return item.setQuantity * Math.max(1, item.piecesPerSet || item.sizes.length);
}

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

async function mutateInventory(
  items: LocalOrder["items"],
  mode: "reserve" | "release" | "deduct" | "restore",
) {
  const cms = await getCmsSnapshot();
  const products = [...cms.products];

  for (const item of items) {
    const pieces = pieceCount(item);
    if (pieces <= 0) continue;
    if (mode === "reserve") {
      const product = products.find((row) => row.slug === item.slug);
      const available = (product?.stock ?? 0) - (product?.reserved ?? 0);
      if (!product || available < pieces) {
        throw new Error(
          `Insufficient stock for ${item.name}. Available units: ${Math.max(0, available)}.`,
        );
      }
      applyPieces(products, item.slug, { reserved: pieces });
    }
    if (mode === "release") {
      applyPieces(products, item.slug, { reserved: -pieces });
    }
    if (mode === "deduct") {
      applyPieces(products, item.slug, {
        reserved: -pieces,
        stock: -pieces,
        sold: pieces,
      });
    }
    if (mode === "restore") {
      applyPieces(products, item.slug, {
        stock: pieces,
        sold: -pieces,
      });
    }
  }

  await saveCmsSnapshot({ products });
}

export async function reserveInventoryForOrder(order: LocalOrder) {
  await mutateInventory(order.items, "reserve");
}

export async function releaseInventoryForOrder(order: LocalOrder) {
  await mutateInventory(order.items, "release");
}

export async function deductInventoryForOrder(order: LocalOrder) {
  await mutateInventory(order.items, "deduct");
}

export async function restoreInventoryForOrder(order: LocalOrder) {
  await mutateInventory(order.items, "restore");
}

export async function syncInventoryForOrderStatusChange(
  order: LocalOrder,
  previousStatus: LocalOrder["status"],
  nextStatus: LocalOrder["status"],
) {
  if (previousStatus === nextStatus) return;

  if (nextStatus === "Rejected") {
    if (previousStatus === "Pending approval") {
      await releaseInventoryForOrder(order);
    } else {
      await restoreInventoryForOrder(order);
    }
    return;
  }

  if (nextStatus === "Approved" && previousStatus === "Pending approval") {
    await deductInventoryForOrder(order);
  }
}
