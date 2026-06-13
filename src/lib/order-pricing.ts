import { getCatalogProducts } from "@/lib/catalog";
import { getCmsSnapshot } from "@/lib/cms-store";
import { getClient, type LocalOrder } from "@/lib/local-db";
import { sumOrderPieces } from "@/lib/order-pieces";
import { computeOrderPricing } from "@/lib/order-pricing-breakdown";
import { resolvePlatformFeeConfig } from "@/lib/platform-fee-config";
import { resolveShippingConfig } from "@/lib/shipping-config";
import {
  assertProductPurchasableForOrder,
  normalizeClientTier,
} from "@/lib/product-purchase-eligibility";
import { productSetPrice } from "@/lib/product-pricing";

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
  const client = await getClient(clientId);
  if (!client) throw new Error("Client not found");
  const clientTier = normalizeClientTier(client.clientTier);

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
    assertProductPurchasableForOrder(product, clientTier);
    const sizes = line.sizes?.length ? line.sizes : product.sizes;
    const setPrice = productSetPrice(product, line.color, sizes);
    if (!Number.isFinite(setPrice) || setPrice <= 0) {
      throw new Error(`Product "${line.slug}" has invalid pricing`);
    }
    const setQuantity = Math.max(1, Number(line.setQuantity) || 1);
    const piecesPerSet = Math.max(1, sizes.length);
    const lineTotal = setPrice * setQuantity;
    if (!Number.isFinite(lineTotal) || lineTotal <= 0) {
      throw new Error(
        `Order line for "${line.slug}" must total more than zero`,
      );
    }
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
  const totalPieces = sumOrderPieces(items);
  const cms = await getCmsSnapshot();
  const pricing = computeOrderPricing({
    subtotal,
    b2bPricing: true,
    totalPieces,
    shippingConfig: resolveShippingConfig(cms.siteSettings),
    platformFee: resolvePlatformFeeConfig(cms.siteSettings),
  });
  const payload = {
    clientId,
    clientEmail: input.clientEmail,
    dispatchAddress: input.dispatchAddress?.trim() ?? "",
    note: input.note?.trim(),
    items,
    subtotal: pricing.subtotal,
    shipping: pricing.shipping,
    tax: pricing.tax,
    platformFee: pricing.platformFee,
    platformFeeGst: pricing.platformFeeGst,
    roundOff: pricing.roundOff,
    total: pricing.total,
  };
  return payload;
}
