import { getCatalogProducts } from "@/lib/catalog";
import { productSetPrice } from "@/lib/product-pricing";
import { clearProductPickPending } from "@/lib/order-bot/conversation";
import { validateSetQuantity } from "@/lib/order-bot/quantity";
import {
  touchBotSession,
  type BotSession,
} from "@/lib/order-bot/session-store";
import { firstProductImage } from "@/lib/order-bot/product-image";
import type { BotCartLine, BotProductPreview } from "@/lib/order-bot/types";

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatStockLabel(product: BotProductPreview) {
  if (!product.inStock) return "out of stock";
  if (product.setsInStock !== undefined && product.setsInStock <= 40) {
    return `**${product.setsInStock} sets left**`;
  }
  return "in stock";
}

export async function enrichCartLines(clientId: string, cart: BotCartLine[]) {
  if (!cart.length) return { cart, total: 0 };
  const slugs = [...new Set(cart.map((line) => line.slug))];
  const catalog = await getCatalogProducts({
    clientId,
    ids: slugs,
    limit: Math.max(slugs.length, 1),
  });
  const bySlug = new Map(
    catalog.items.map((product) => [product.slug, product]),
  );
  let total = 0;
  const enriched = cart.map((line) => {
    const product = bySlug.get(line.slug);
    const setPrice = product
      ? productSetPrice(product, line.color, line.sizes)
      : 0;
    const lineTotal = setPrice * line.setQuantity;
    total += lineTotal;
    return {
      ...line,
      name: product?.name ?? line.name,
      imageUrl: firstProductImage(product) || line.imageUrl,
      lineTotal,
    };
  });
  return { cart: enriched, total };
}

export function formatCartReply(cart: BotCartLine[], total: number) {
  if (!cart.length) {
    return "Your cart is empty. Browse a category first, then **1 50** or **add 1 50 sets**.";
  }
  const lines = cart
    .map(
      (line, index) =>
        `${index + 1}. ${line.name} — **${line.setQuantity}** set(s), ${line.color}`,
    )
    .join("\n");
  return `${lines}\n\nEstimated total: **${money(total)}**\nTo change qty: **update cart 1 30** (cart line #, new sets). Say **place order** when ready.`;
}

export type CartApplyResult = {
  ok: boolean;
  reply: string;
  cart: BotCartLine[];
  cartTotal?: number;
};

export async function applyProductSetsToCart(
  session: BotSession,
  product: BotProductPreview,
  requestedSets: number,
  mode: "add" | "set",
  colorOverride?: string,
): Promise<CartApplyResult> {
  clearProductPickPending(session);
  session.focusProductIndex = product.index;

  const validated = validateSetQuantity(product, requestedSets);
  if (!validated.ok) {
    touchBotSession(session);
    return {
      ok: false,
      reply: validated.notes.join("\n"),
      cart: session.cart,
    };
  }

  const setQuantity = validated.quantity;
  const color = colorOverride || product.color;
  const existing = session.cart.find(
    (line) => line.slug === product.slug && line.color === color,
  );

  if (existing) {
    existing.setQuantity =
      mode === "add" ? existing.setQuantity + setQuantity : setQuantity;
  } else {
    session.cart.push({
      slug: product.slug,
      name: product.name,
      color,
      sizes: product.sizes,
      setQuantity,
      imageUrl: product.imageUrl,
    });
  }

  const { cart, total } = await enrichCartLines(session.clientId, session.cart);
  session.cart = cart;
  touchBotSession(session);

  const prefix =
    mode === "set"
      ? `Updated **${product.name}**`
      : `Added **${product.name}**`;
  const noteBlock = validated.notes.length
    ? `\n\n${validated.notes.join("\n")}`
    : "";

  const line = cart.find(
    (entry) => entry.slug === product.slug && entry.color === color,
  );
  const finalQty = line?.setQuantity ?? setQuantity;

  return {
    ok: true,
    reply: `${prefix} — **${finalQty}** set(s), ${color}.${noteBlock}\n\nCart total **${money(total)}** — see lines below.`,
    cart,
    cartTotal: total,
  };
}

export async function applyCartLineQuantity(
  session: BotSession,
  lineIndex: number,
  requestedSets: number,
): Promise<CartApplyResult> {
  const line = session.cart[lineIndex - 1];
  if (!line) {
    return {
      ok: false,
      reply: `No cart line #${lineIndex}. Say **cart** to see lines.`,
      cart: session.cart,
    };
  }

  const productPreview: BotProductPreview = {
    index: lineIndex,
    slug: line.slug,
    name: line.name,
    category: "",
    color: line.color,
    sizes: line.sizes,
    setPrice: 0,
    moq: 1,
    inStock: true,
  };

  const catalog = await getCatalogProducts({
    clientId: session.clientId,
    ids: [line.slug],
    limit: 1,
  });
  const catalogProduct = catalog.items[0];
  if (catalogProduct) {
    productPreview.moq = catalogProduct.moq;
    productPreview.imageUrl = firstProductImage(catalogProduct);
    const stock = Number(catalogProduct.stock);
    if (Number.isFinite(stock)) {
      productPreview.setsInStock = stock;
      productPreview.inStock = stock > 0;
    }
  }

  const validated = validateSetQuantity(productPreview, requestedSets);
  if (!validated.ok) {
    touchBotSession(session);
    return { ok: false, reply: validated.notes.join("\n"), cart: session.cart };
  }

  line.setQuantity = validated.quantity;
  const { cart, total } = await enrichCartLines(session.clientId, session.cart);
  session.cart = cart;
  touchBotSession(session);

  const noteBlock = validated.notes.length
    ? `\n\n${validated.notes.join("\n")}`
    : "";

  return {
    ok: true,
    reply: `Cart line **${lineIndex}** (**${line.name}**) set to **${validated.quantity}** set(s).${noteBlock}\n\nCart total **${money(total)}** — see lines below.`,
    cart,
    cartTotal: total,
  };
}
