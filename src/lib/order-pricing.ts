import { getCatalogProducts } from "@/lib/catalog";
import { computeGstOnSubtotal } from "@/lib/gst-display";
import { assertInventoryAvailableForOrder } from "@/lib/order-inventory";
import { productSetPrice } from "@/lib/product-pricing";
import type { LocalOrder } from "@/lib/local-db";

export type OrderItemInput = {
  slug: string;
  name?: string;
  color: string;
  sizes: string[];
  setQuantity: number;
  piecesPerSet?: number;
  unitPrice?: number;
  lineTotal?: number;
};

export async function buildValidatedOrderPayload(
  clientId: string,
  input: {
    clientEmail: string;
    dispatchAddress?: string;
    note?: string;
    items: OrderItemInput[];
  },
) {
  const slugs = [...new Set(input.items.map((item) => item.slug))];
  const catalog = await getCatalogProducts({
    ids: slugs,
    clientId,
    limit: Math.max(slugs.length, 1),
  });
  const bySlug = new Map(
    catalog.items.map((product) => [product.slug, product]),
  );

  const items: LocalOrder["items"] = [];
  for (const line of input.items) {
    const product = bySlug.get(line.slug);
    if (!product) throw new Error(`Product not found: ${line.slug}`);
    const sizes = line.sizes?.length ? line.sizes : product.sizes;
    const setPrice = productSetPrice(product, line.color, sizes);
    const setQuantity = Math.max(1, Number(line.setQuantity) || 1);
    const piecesPerSet = Math.max(1, sizes.length);
    const lineTotal = setPrice * setQuantity;
    items.push({
      slug: line.slug,
      name: product.name,
      color: line.color || product.colors[0] || "Default",
      sizes,
      setQuantity,
      piecesPerSet,
      unitPrice: Math.round(setPrice / piecesPerSet),
      lineTotal,
      image: product.images?.[0]?.trim() ?? "",
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const gst = computeGstOnSubtotal(subtotal, null, { b2bPricing: true });
  const tax = gst.amount;
  const total = subtotal + tax;
  const payload = {
    clientId,
    clientEmail: input.clientEmail,
    dispatchAddress: input.dispatchAddress?.trim() ?? "",
    note: input.note?.trim(),
    items,
    subtotal,
    tax,
    total,
  };
  await assertInventoryAvailableForOrder({
    ...payload,
    id: "validate",
    status: "Pending approval",
    paymentMode: "cheque",
    paymentStatus: "Pending",
    creditDays: 90,
    depositStatus: "Not deposited",
    dispatchHistory: [],
    createdAt: new Date().toISOString(),
  });
  return payload;
}
