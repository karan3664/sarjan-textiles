import "server-only";

import { getCatalogProducts } from "@/lib/catalog";
import {
  isProductSoldOut,
  productStockOnHand,
  productWholesaleMinSets,
} from "@/lib/product-availability";
import { productSetPrice } from "@/lib/product-pricing";
import { firstProductImage } from "@/lib/order-bot/product-image";
import type { BotProductPreview } from "@/lib/order-bot/types";
import type { BotSession } from "@/lib/order-bot/session-store";
import { touchBotSession } from "@/lib/order-bot/session-store";
import type { Product } from "@/data/mock";
import {
  normalizePageContext,
  productPreviewFromPageContext,
  type AiPageContext,
  type AiPageProductContext,
} from "@/lib/ai-chat/page-context";

function productCategoryName(
  category: Product["category"] | string | undefined,
): string {
  if (typeof category === "string") return category.trim();
  if (category && typeof category === "object" && "en" in category) {
    return String((category as { en?: string }).en ?? "").trim();
  }
  return "";
}

function productToPreview(product: Product, index = 1): BotProductPreview {
  const color = product.colors[0] ?? "Default";
  const sizes = product.sizes.length ? product.sizes : ["Free"];
  const stock = productStockOnHand(product);
  return {
    index,
    slug: product.slug,
    name: product.name,
    category: productCategoryName(product.category),
    color,
    sizes,
    setPrice: productSetPrice(product, color, sizes),
    moq: productWholesaleMinSets(product),
    inStock: !isProductSoldOut(product) && (stock ?? 0) > 0,
    setsInStock: stock,
    imageUrl: firstProductImage(product) || undefined,
  };
}

function productToContext(product: Product): AiPageProductContext {
  const preview = productToPreview(product);
  return {
    id: product.slug,
    slug: product.slug,
    name: preview.name,
    category: preview.category,
    setPrice: preview.setPrice,
    moq: preview.moq,
    inStock: preview.inStock,
    setsInStock: preview.setsInStock,
    color: preview.color,
  };
}

export async function enrichPageContext(
  context: AiPageContext,
  clientId: string,
): Promise<AiPageContext> {
  const next = { ...context };

  if (next.kind === "product" && next.product) {
    const lookup = next.product.slug ?? next.product.id;
    if (lookup) {
      const catalog = await getCatalogProducts({
        clientId,
        ids: [lookup],
        limit: 1,
      });
      const item = catalog.items[0];
      if (item) {
        next.product = productToContext(item);
      }
    }
  }

  return next;
}

export async function applyPageContextToSession(
  session: BotSession,
  rawContext: unknown,
  clientId: string,
  fallbackPath?: string,
) {
  const normalized = normalizePageContext(rawContext, fallbackPath);
  if (!normalized) return;

  const enriched = await enrichPageContext(normalized, clientId);
  session.pageContext = enriched;

  const preview = productPreviewFromPageContext(enriched);
  if (preview) {
    session.lastProducts = [preview];
    session.lastCategory = preview.category;
    session.focusProductIndex = 1;
  }

  touchBotSession(session);
}
