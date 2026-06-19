import type { BotProductPreview } from "@/lib/order-bot/types";

export type AiPageKind =
  | "home"
  | "product"
  | "cart"
  | "orders"
  | "wishlist"
  | "category"
  | "other";

export type AiPageProductContext = {
  id: string;
  slug?: string;
  name: string;
  category?: string;
  setPrice?: number;
  moq?: number;
  inStock?: boolean;
  setsInStock?: number;
  color?: string;
};

export type AiPageContext = {
  kind: AiPageKind;
  path?: string;
  route?: string;
  category?: { slug?: string; name: string };
  product?: AiPageProductContext;
  cart?: { lineCount: number; totalPieces?: number; subtotal?: number };
  order?: { orderId?: string; status?: string };
  wishlist?: { itemCount?: number };
};

const PAGE_KINDS = new Set<AiPageKind>([
  "home",
  "product",
  "cart",
  "orders",
  "wishlist",
  "category",
  "other",
]);

export function pageKindFromPath(path: string): AiPageKind {
  const normalized = path.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (normalized === "/" || normalized === "") return "home";
  if (/^\/products\/[^/]+$/.test(normalized)) return "product";
  if (
    normalized.startsWith("/products") ||
    normalized.startsWith("/categories")
  ) {
    return "category";
  }
  if (normalized.startsWith("/cart")) return "cart";
  if (normalized.startsWith("/wishlist")) return "wishlist";
  if (
    normalized.startsWith("/orders") ||
    normalized.startsWith("/order-tracking") ||
    normalized.startsWith("/account/orders")
  ) {
    return "orders";
  }
  return "other";
}

export function normalizePageContext(
  raw: unknown,
  fallbackPath?: string,
): AiPageContext | null {
  if (!raw || typeof raw !== "object") {
    if (fallbackPath) {
      return { kind: pageKindFromPath(fallbackPath), path: fallbackPath };
    }
    return null;
  }

  const input = raw as Record<string, unknown>;
  const kindRaw = String(input.kind ?? "").trim() as AiPageKind;
  const kind = PAGE_KINDS.has(kindRaw)
    ? kindRaw
    : fallbackPath
      ? pageKindFromPath(fallbackPath)
      : "other";

  const context: AiPageContext = {
    kind,
    path: typeof input.path === "string" ? input.path : fallbackPath,
    route: typeof input.route === "string" ? input.route : undefined,
  };

  if (input.category && typeof input.category === "object") {
    const cat = input.category as Record<string, unknown>;
    const name = String(cat.name ?? "").trim();
    if (name) {
      context.category = {
        name,
        slug: typeof cat.slug === "string" ? cat.slug : undefined,
      };
    }
  }

  if (input.product && typeof input.product === "object") {
    const product = input.product as Record<string, unknown>;
    const id = String(product.id ?? product.slug ?? "").trim();
    const name = String(product.name ?? "").trim();
    if (id || name) {
      context.product = {
        id: id || name,
        slug: typeof product.slug === "string" ? product.slug : id,
        name,
        category:
          typeof product.category === "string" ? product.category : undefined,
        setPrice:
          typeof product.setPrice === "number" ? product.setPrice : undefined,
        moq: typeof product.moq === "number" ? product.moq : undefined,
        inStock:
          typeof product.inStock === "boolean" ? product.inStock : undefined,
        setsInStock:
          typeof product.setsInStock === "number"
            ? product.setsInStock
            : undefined,
        color: typeof product.color === "string" ? product.color : undefined,
      };
    }
  }

  if (input.cart && typeof input.cart === "object") {
    const cart = input.cart as Record<string, unknown>;
    const lineCount = Number(cart.lineCount);
    if (Number.isFinite(lineCount)) {
      context.cart = {
        lineCount,
        totalPieces:
          typeof cart.totalPieces === "number" ? cart.totalPieces : undefined,
        subtotal: typeof cart.subtotal === "number" ? cart.subtotal : undefined,
      };
    }
  }

  if (input.order && typeof input.order === "object") {
    const order = input.order as Record<string, unknown>;
    context.order = {
      orderId: typeof order.orderId === "string" ? order.orderId : undefined,
      status: typeof order.status === "string" ? order.status : undefined,
    };
  }

  if (input.wishlist && typeof input.wishlist === "object") {
    const wishlist = input.wishlist as Record<string, unknown>;
    context.wishlist = {
      itemCount:
        typeof wishlist.itemCount === "number" ? wishlist.itemCount : undefined,
    };
  }

  return context;
}

export function formatPageContextForPrompt(context: AiPageContext | undefined) {
  if (!context) return "";

  const lines = [`CURRENT PAGE: ${context.kind.toUpperCase()}`];
  if (context.path) lines.push(`Path: ${context.path}`);
  if (context.route) lines.push(`App route: ${context.route}`);

  if (context.category?.name) {
    lines.push(
      `Category: ${context.category.name}${context.category.slug ? ` (${context.category.slug})` : ""}`,
    );
  }

  if (context.product) {
    const p = context.product;
    lines.push("Product the user is viewing:");
    lines.push(`• Name: ${p.name}`);
    if (p.id) lines.push(`• ID / slug: ${p.id}`);
    if (p.category) lines.push(`• Category: ${p.category}`);
    if (p.setPrice != null) lines.push(`• Price per set: ₹${p.setPrice}`);
    if (p.moq != null) lines.push(`• MOQ (sets): ${p.moq}`);
    if (p.inStock != null) {
      lines.push(
        `• Stock: ${p.inStock ? "in stock" : "out of stock"}${p.setsInStock != null ? ` (${p.setsInStock} sets)` : ""}`,
      );
    }
    if (p.color) lines.push(`• Default color: ${p.color}`);
    lines.push(
      "When the user says “this product”, “this item”, or asks about price/MQ/stock without naming another SKU, answer about THIS product.",
    );
  }

  if (context.cart) {
    lines.push(
      `Cart: ${context.cart.lineCount} line(s)${context.cart.totalPieces != null ? `, ${context.cart.totalPieces} pieces` : ""}${context.cart.subtotal != null ? `, ~₹${context.cart.subtotal}` : ""}`,
    );
  }

  if (context.order?.orderId) {
    lines.push(
      `Order context: ${context.order.orderId}${context.order.status ? ` (${context.order.status})` : ""}`,
    );
  }

  if (context.wishlist?.itemCount != null) {
    lines.push(`Wishlist: ${context.wishlist.itemCount} saved item(s)`);
  }

  return lines.join("\n");
}

export function productPreviewFromPageContext(
  context: AiPageContext,
): BotProductPreview | null {
  if (context.kind !== "product" || !context.product?.name) return null;
  const p = context.product;
  return {
    index: 1,
    slug: p.slug ?? p.id,
    name: p.name,
    category: p.category ?? "",
    color: p.color ?? "Default",
    sizes: ["Free"],
    setPrice: p.setPrice ?? 0,
    moq: p.moq,
    inStock: p.inStock ?? true,
    setsInStock: p.setsInStock,
  };
}

const THIS_PRODUCT =
  /\b(this product|this item|current product|is product|ye product|yeh product|iss product|is ka|iska|is ki|iske)\b/i;
const MOQ_INTENT = /\b(moq|minimum order|min(?:imum)? qty|min sets)\b/i;
const PRICE_INTENT = /\b(price|cost|rate|kitna|kitne ka|set price)\b/i;
const STOCK_INTENT = /\b(stock|available|in stock|out of stock)\b/i;

export function tryAnswerFromPageContext(
  context: AiPageContext | undefined,
  message: string,
): string | null {
  if (!context?.product) return null;
  const text = message.trim();
  if (!text) return null;

  const aboutThis =
    THIS_PRODUCT.test(text) ||
    MOQ_INTENT.test(text) ||
    PRICE_INTENT.test(text) ||
    STOCK_INTENT.test(text) ||
    /^(what|tell me|details|info|batao|bataiye)/i.test(text);

  if (!aboutThis && context.kind !== "product") return null;

  const p = context.product;
  const parts: string[] = [`**${p.name}**`];
  if (p.category) parts.push(`Category: **${p.category}**`);
  if (p.setPrice != null)
    parts.push(`Price: **₹${p.setPrice.toLocaleString("en-IN")}** per set`);
  if (p.moq != null) parts.push(`MOQ: **${p.moq}** set(s)`);
  if (p.inStock != null) {
    parts.push(
      p.inStock
        ? `In stock${p.setsInStock != null ? ` (**${p.setsInStock}** sets)` : ""}`
        : "**Out of stock**",
    );
  }
  parts.push(
    "Use **Add 25 / 50 / 100** on the product card or ask me to add sets to cart.",
  );
  return parts.join("\n");
}

export function mergePageContext(
  base: AiPageContext | null,
  overlay: AiPageContext | null,
): AiPageContext | null {
  if (!base && !overlay) return null;
  if (!base) return overlay;
  if (!overlay) return base;
  return {
    ...base,
    ...overlay,
    category: overlay.category ?? base.category,
    product: overlay.product ?? base.product,
    cart: overlay.cart ?? base.cart,
    order: overlay.order ?? base.order,
    wishlist: overlay.wishlist ?? base.wishlist,
    kind: overlay.kind && overlay.kind !== "other" ? overlay.kind : base.kind,
  };
}
