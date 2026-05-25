import { getCatalogProducts } from "@/lib/catalog";
import { buildValidatedOrderPayload } from "@/lib/order-pricing";
import { productSetPrice } from "@/lib/product-pricing";
import { createOrder } from "@/lib/local-db";
import { siteSettings } from "@/data/site";
import {
  browseBotCatalog,
  listBotCategories,
  searchBotProducts,
} from "@/lib/order-bot/catalog-tools";
import {
  applyCartLineQuantity,
  applyProductSetsToCart,
  enrichCartLines,
  formatStockLabel,
} from "@/lib/order-bot/cart-ops";
import { buildOrderPreviews } from "@/lib/order-bot/order-previews";
import { markProductPickPending } from "@/lib/order-bot/conversation";
import {
  findClientOrder,
  getClientOrders,
} from "@/lib/order-bot/order-tracking";
import {
  touchBotSession,
  type BotSession,
} from "@/lib/order-bot/session-store";
import type { BotCartLine, BotProductPreview } from "@/lib/order-bot/types";
import { requestAdminNotificationRefresh } from "@/lib/admin-notification-live";
import { notifyEInvoiceOrderCreated } from "@/lib/compliance-webhooks";
import { sendOrderPlacedEmail } from "@/lib/order-emails";

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatProductsForTool(
  products: BotProductPreview[],
  intro?: string,
) {
  if (!products.length) {
    return intro
      ? `${intro}\n\nNo products found.`
      : "No products found for that search.";
  }
  const list = products
    .map(
      (item) =>
        `${item.index}. ${item.name} (${item.category}) — ${money(item.setPrice)}/set, MOQ ${item.moq ?? 1}, ${formatStockLabel(item)}, slug: ${item.slug}`,
    )
    .join("\n");
  return intro ? `${intro}\n\n${list}` : list;
}

function formatCartForTool(cart: BotCartLine[], total: number) {
  if (!cart.length) return "Cart is empty.";
  const lines = cart
    .map(
      (line, i) =>
        `${i + 1}. ${line.name} — ${line.setQuantity} set(s), ${line.color}, sizes: ${line.sizes.join(", ")}`,
    )
    .join("\n");
  return `${lines}\nEstimated total: ${money(total)}`;
}

async function placeBotOrder(session: BotSession, note?: string) {
  if (!session.cart.length) {
    throw new Error("Cart is empty. Add products before placing an order.");
  }
  const validated = await buildValidatedOrderPayload(session.clientId, {
    clientEmail: session.clientEmail,
    note: [note?.trim(), "[Placed via Sarjan AI order assistant]"]
      .filter(Boolean)
      .join(" "),
    items: session.cart.map((line) => ({
      slug: line.slug,
      color: line.color,
      sizes: line.sizes,
      setQuantity: line.setQuantity,
    })),
  });
  const order = await createOrder(validated, { placedVia: "ai_bot" });
  session.lastPlacedOrderId = order.id;
  session.cart = [];
  session.lastProducts = [];
  session.pendingProductPick = false;
  void sendOrderPlacedEmail(order).catch((error) =>
    console.error("Bot order email failed", error),
  );
  void notifyEInvoiceOrderCreated(order);
  requestAdminNotificationRefresh();
  return order;
}

export type BotToolName =
  | "list_categories"
  | "browse_products"
  | "search_products"
  | "add_to_cart"
  | "update_cart_line"
  | "view_cart"
  | "clear_cart"
  | "place_order"
  | "track_orders"
  | "website_info";

export async function executeBotTool(
  session: BotSession,
  tool: BotToolName,
  args: Record<string, unknown>,
): Promise<string> {
  touchBotSession(session);

  switch (tool) {
    case "list_categories": {
      const categories = await listBotCategories();
      if (!categories.length) return "No categories in catalog yet.";
      return categories
        .map((item) => {
          if (item.kind === "collection") {
            return `• ${item.name} (collection) — browse: ${item.href ?? `/collections/${item.slug}`}`;
          }
          return `• ${item.name} — ${item.count} products — ${item.href ?? ""}`;
        })
        .join("\n");
    }

    case "browse_products": {
      const query = String(args.query ?? "").trim();
      if (!query)
        return "Error: query is required (category or collection name).";
      const categories = await listBotCategories();
      const browse = await browseBotCatalog(
        session.clientId,
        query,
        categories,
      );
      session.lastCategory = browse.label;
      session.lastProducts = browse.products;
      session.attachProductCards = true;
      markProductPickPending(session);
      const note = browse.collectionHref
        ? ` Site: ${browse.collectionHref}`
        : "";
      return `${browse.products.length} product(s) indexed for **${browse.label}**. UI shows photo cards; user picks by number (e.g. add 1 50 sets).${note}`;
    }

    case "search_products": {
      const q = String(args.query ?? "").trim();
      if (!q) return "Error: query is required.";
      const products = await searchBotProducts(session.clientId, {
        q,
        limit: 8,
      });
      session.lastProducts = products;
      session.attachProductCards = true;
      markProductPickPending(session);
      return `${products.length} match(es) for "${q}". UI shows photo cards; do not repeat a numbered catalog list in your reply.`;
    }

    case "add_to_cart": {
      const productIndex = Math.max(1, Number(args.product_index) || 1);
      const sets = Math.max(1, Number(args.sets) || 1);
      const color =
        typeof args.color === "string" ? args.color.trim() : undefined;
      const product = session.lastProducts[productIndex - 1];
      if (!product) {
        return `Error: product #${productIndex} not in the last list. Browse or search first.`;
      }
      const mode = args.replace === true ? "set" : "add";
      const result = await applyProductSetsToCart(
        session,
        product,
        sets,
        mode,
        color,
      );
      return result.reply;
    }

    case "update_cart_line": {
      const lineIndex = Math.max(1, Number(args.line_index) || 1);
      const sets = Math.max(1, Number(args.sets) || 1);
      const result = await applyCartLineQuantity(session, lineIndex, sets);
      return result.reply;
    }

    case "view_cart": {
      const { cart, total } = await enrichCartLines(
        session.clientId,
        session.cart,
      );
      session.cart = cart;
      session.attachCartCards = true;
      return cart.length
        ? `Cart has ${cart.length} line(s), total ${money(total)}. UI shows cart cards — keep reply to one short sentence.`
        : "Cart is empty.";
    }

    case "clear_cart": {
      session.cart = [];
      return "Cart cleared.";
    }

    case "place_order": {
      const note = typeof args.note === "string" ? args.note.trim() : undefined;
      try {
        const order = await placeBotOrder(session, note);
        session.lastOrderPreviews = await buildOrderPreviews(session.clientId, [
          order,
        ]);
        return `Order placed successfully.\nOrder ID: ${order.id}\nStatus: ${order.status}\nTotal: ${money(order.subtotal)}\nTrack at /account or /order-tracking`;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Could not place order.";
      }
    }

    case "track_orders": {
      const orderId =
        typeof args.order_id === "string" ? args.order_id.trim() : "";
      if (orderId) {
        const order = await findClientOrder(session.clientId, orderId);
        if (!order) {
          session.lastOrderPreviews = undefined;
          return `No order **${orderId.toUpperCase()}** found on your account. Check the ID or say "my orders" for recent list.`;
        }
        session.lastOrderPreviews = await buildOrderPreviews(session.clientId, [
          order,
        ]);
        return `Order **${order.id}** — ${order.status}, ${money(order.subtotal)}. UI shows line items with photos; do not list items in text.`;
      }
      const orders = await getClientOrders(session.clientId, 6);
      session.lastOrderPreviews = await buildOrderPreviews(
        session.clientId,
        orders,
      );
      return orders.length
        ? `${orders.length} recent order(s) loaded with product photos in UI. One short intro only — no bullet list.`
        : "No orders on this account yet.";
    }

    case "website_info": {
      const topic = String(args.topic ?? "general").toLowerCase();
      switch (topic) {
        case "contact":
          return [
            `${siteSettings.brandName}`,
            `Phone: ${siteSettings.phone}`,
            `Email: ${siteSettings.email}`,
            `Address: ${siteSettings.address}`,
            `Hours: ${siteSettings.openTimeWeekday}; ${siteSettings.openTimeSunday}`,
            `Contact page: /contact`,
          ].join("\n");
        case "credit":
          return `Approved B2B clients get **${siteSettings.creditTermDays}-day credit** on cheque workflow. Payment and deposit status show on each order in **/account**.`;
        case "moq":
          return "Each product has a **MOQ** (minimum sets per line). MOQ is shown in catalog and when you browse products. Admin confirms stock on approval.";
        case "register":
          return "New clients: **/register** with GST verification. After admin approval you can order here and on the storefront.";
        case "tracking":
          return "Track orders: **/order-tracking** (lookup by order ID) or **/account** → Your Orders for full timeline, LR number, and dispatch updates.";
        case "pages":
          return [
            "Key pages:",
            "• /products — catalog",
            "• /categories — categories",
            "• /collections — curated collections",
            "• /account — orders & profile",
            "• /order-tracking — track by order ID",
            "• /cart — shopping cart",
            "• /contact — contact us",
          ].join("\n");
        default:
          return [
            siteSettings.seo.description,
            "",
            "I help with catalog, cart, placing B2B orders, and order tracking for logged-in clients only.",
          ].join("\n");
      }
    }

    default:
      return `Unknown tool: ${tool}`;
  }
}

export function defaultQuickReplies(session: BotSession) {
  const replies: string[] = [];
  if (session.lastProducts.length) {
    replies.push(`Add ${session.lastProducts[0]?.index ?? 1} 50 sets`);
  }
  if (session.cart.length) {
    replies.push("Place order", "My cart");
  }
  replies.push("Track my orders", "Categories");
  return [...new Set(replies)].slice(0, 4);
}
