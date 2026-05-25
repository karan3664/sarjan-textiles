import { getCatalogProducts } from "@/lib/catalog";
import type { LocalOrder } from "@/lib/local-db";
import { firstProductImage } from "@/lib/order-bot/product-image";
import type { BotOrderPreview } from "@/lib/order-bot/types";

export async function buildOrderPreviews(
  clientId: string,
  orders: LocalOrder[],
): Promise<BotOrderPreview[]> {
  if (!orders.length) return [];
  const slugs = [
    ...new Set(
      orders.flatMap((order) =>
        order.items.map((item) => item.slug?.trim()).filter(Boolean),
      ),
    ),
  ] as string[];

  const catalog = slugs.length
    ? await getCatalogProducts({
        clientId,
        ids: slugs,
        limit: Math.max(slugs.length, 1),
      })
    : { items: [] };

  const imageBySlug = new Map(
    catalog.items.map((product) => [product.slug, firstProductImage(product)]),
  );

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    subtotal: order.subtotal,
    placedVia: order.placedVia,
    items: order.items.map((item) => ({
      slug: item.slug,
      name: item.name,
      imageUrl: item.image?.trim() || imageBySlug.get(item.slug) || undefined,
      color: item.color,
      sizes: item.sizes,
      setQuantity: item.setQuantity,
      lineTotal: item.lineTotal,
    })),
  }));
}

export async function buildOrderPreview(
  clientId: string,
  order: LocalOrder,
): Promise<BotOrderPreview> {
  const [preview] = await buildOrderPreviews(clientId, [order]);
  return preview;
}
