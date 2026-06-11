import { buildValidatedOrderPayload } from "@/lib/order-pricing";
import { createOrder } from "@/lib/local-db";
import {
  browseBotCatalog,
  listBotCategories,
  listBotCategoryPreviews,
  resolveProductFromSession,
  searchBotProducts,
} from "@/lib/order-bot/catalog-tools";
import { answerWebsitePolicyQuestion } from "@/lib/order-bot/site-policies";
import {
  answerCatalogQuestion,
  clearProductPickPending,
  contextualFallback,
  formatProductDetail,
  isAffirmative,
  isNegative,
  isOrderTrackingIntent,
  isVulgarMessage,
  markProductPickPending,
  parseCartQuantityUpdate,
  parseProductIndexAndSets,
  parseProductPickIndex,
  pickProductFromSession,
  tryParseLooseSetQuantity,
  vulgarRefusal,
} from "@/lib/order-bot/conversation";
import {
  getBotSession,
  touchBotSession,
  type BotSession,
} from "@/lib/order-bot/session-store";
import type {
  BotCartLine,
  BotChatResponse,
  BotNavAction,
  BotProductPreview,
} from "@/lib/order-bot/types";
import {
  applyCartLineQuantity,
  applyProductSetsToCart,
  enrichCartLines,
  hydrateBotCartFromStore,
  persistBotCartToStore,
} from "@/lib/order-bot/cart-ops";
import { buildOrderPreview } from "@/lib/order-bot/order-previews";
import { executeBotTool } from "@/lib/order-bot/actions";
import {
  extractBrowseSubject,
  resolveCatalogSearchTerm,
  shouldBrowseCatalog,
} from "@/lib/order-bot/natural-language";
import { tryHandleOrderBotWithLlm } from "@/lib/order-bot/llm-agent";
import { orderPlacedNavActions } from "@/lib/order-bot/order-placed-ui";
import { requestAdminNotificationRefresh } from "@/lib/admin-notification-live";
import { notifyEInvoiceOrderCreated } from "@/lib/compliance-webhooks";
import { sendOrderPlacedEmail } from "@/lib/order-emails";

const BROWSE_NAV_ACTIONS: BotNavAction[] = [
  { label: "All categories", href: "/categories" },
  { label: "Browse products", href: "/products" },
  { label: "Home", href: "/" },
];

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

/** Short text when product cards carry the catalog (avoids duplicate text list). */
function productsCardsIntro(
  products: BotProductPreview[],
  options?: { label?: string; collectionHref?: string; didYouMean?: boolean },
) {
  if (!products.length) {
    return "No products found for that category or search. Use the buttons below to browse the store, or type **categories**.";
  }
  const siteLink = options?.collectionHref
    ? `\n\nBrowse on site: ${options.collectionHref}`
    : "";
  const label = options?.label ? `**${options.label}** — ` : "";
  const hint = options?.didYouMean
    ? "Reply **yes** for the first, a **number**, or **add 2 50 sets**:"
    : "Reply **1 50** or **add 1 50 sets** (product # + sets):";
  return `${label}${products.length} product(s) below. ${hint}${siteLink}`;
}

async function buildTrackOrdersResponse(
  session: BotSession,
  text: string,
  quickReplies = DEFAULT_QUICK_REPLIES,
): Promise<BotChatResponse> {
  const orderIdMatch = text.match(/\b(ST-\d+)\b/i);
  await executeBotTool(session, "track_orders", {
    order_id: orderIdMatch?.[1] ?? "",
  });
  const orders = session.lastOrderPreviews;
  session.lastOrderPreviews = undefined;
  touchBotSession(session);

  let reply: string;
  if (!orders?.length) {
    reply = orderIdMatch?.[1]
      ? `No order **${orderIdMatch[1].toUpperCase()}** found. Check the ID or say **my orders**.`
      : "You have no orders yet. Browse products, add sets to cart, then **place order**.";
  } else if (orders.length === 1) {
    const order = orders[0];
    reply = `**${order.id}** — **${order.status}**, ${money(order.subtotal)}. Items below:`;
  } else {
    reply = `Your **${orders.length}** recent orders (newest first):`;
  }

  return {
    sessionId: session.id,
    reply,
    cart: session.cart,
    orders: orders?.length ? orders : undefined,
    quickReplies: ["My orders", "Categories", "Place order"],
  };
}

function formatCart(cart: BotCartLine[], total: number) {
  if (!cart.length)
    return "Your cart is empty. Browse a category first, then **add 1 50 sets** (product number + how many sets).";
  const lines = cart
    .map(
      (line, index) =>
        `${index + 1}. ${line.name} — ${line.setQuantity} set(s), ${line.color}, sizes: ${line.sizes.join(", ")}`,
    )
    .join("\n");
  return `${lines}\n\nEstimated total: **${money(total)}**\nSay **place order** to submit your B2B request.`;
}

function productPickReply(session: BotSession, product: BotProductPreview) {
  touchBotSession(session);
  return {
    sessionId: session.id,
    reply: `**${product.name}** (${product.category}) — ${money(product.setPrice)}/set, MOQ ${product.moq ?? 1}. Add sets below:`,
    products: [product],
    cart: session.cart,
    quickReplies: [
      `Add ${product.index} 1 sets`,
      `Add ${product.index} 50 sets`,
      "Cart",
      "Categories",
    ],
  };
}

function helpMessage() {
  return [
    "I can help you place B2B orders by category:",
    "",
    "• **categories** — list product categories",
    "• **show Ajrakh** or **products in Kurtas** — browse by category",
    "• **search blue cotton** — search catalog",
    "• **1 50** or **add 2 50 sets** — product **#** then sets (low stock auto-adjusts)",
    "• **update cart 1 30** — change qty on cart line 1 when stock is low",
    "• **add 1 20 sets** then **add 1 30 sets** — same product again adds up (50 total)",
    "• **cart** — view cart and total",
    "• **place order** — submit order (shows as *AI order assistant* in history)",
    "• **my orders** — recent order status",
    "",
    "Bulk example: `show Kurtas` → `add 1 100 sets` → `add 2 80 sets` → `cart` → `place order`",
    "Each product line shows **MOQ** — order at or above that; team confirms stock on approval.",
  ].join("\n");
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
  await persistBotCartToStore(session);
  void sendOrderPlacedEmail(order).catch((error) =>
    console.error("Bot order email failed", error),
  );
  void notifyEInvoiceOrderCreated(order);
  requestAdminNotificationRefresh();
  return order;
}

async function addProductToCart(
  session: BotSession,
  product: BotProductPreview,
  setQuantity: number,
  colorOverride?: string,
  quickReplies = ["Categories", "My cart", "Place order", "My orders"],
  mode: "add" | "set" = "add",
): Promise<BotChatResponse> {
  const result = await applyProductSetsToCart(
    session,
    product,
    setQuantity,
    mode,
    colorOverride,
  );
  touchBotSession(session);
  return {
    sessionId: session.id,
    reply: result.reply,
    cart: result.cart,
    cartTotal: result.cartTotal,
    quickReplies,
  };
}

const DEFAULT_QUICK_REPLIES = [
  "Categories",
  "My cart",
  "Place order",
  "My orders",
];

const POLICY_QUICK_REPLIES = [
  "Payment terms",
  "Shipping policy",
  "How to order",
  "Collections",
];

/** Cart / yes / pick / site policies — must run before LLM so short replies are not lost. */
async function tryPreLlmOrderBotHandlers(
  session: BotSession,
  text: string,
): Promise<BotChatResponse | null> {
  const quickReplies = DEFAULT_QUICK_REPLIES;

  const policyReply = answerWebsitePolicyQuestion(text);
  if (policyReply) {
    touchBotSession(session);
    return {
      sessionId: session.id,
      reply: policyReply,
      cart: session.cart,
      quickReplies: POLICY_QUICK_REPLIES,
    };
  }

  const cartQtyUpdate = parseCartQuantityUpdate(text, session.cart.length);
  if (cartQtyUpdate) {
    const result = await applyCartLineQuantity(
      session,
      cartQtyUpdate.lineIndex,
      cartQtyUpdate.sets,
    );
    return {
      sessionId: session.id,
      reply: result.reply,
      cart: result.cart,
      cartTotal: result.cartTotal,
      quickReplies,
    };
  }

  if (session.lastProducts.length) {
    const pickSets = parseProductIndexAndSets(
      text,
      session.lastProducts.length,
    );
    if (pickSets) {
      const product = session.lastProducts[pickSets.index - 1];
      if (product) {
        return addProductToCart(
          session,
          product,
          pickSets.sets,
          undefined,
          quickReplies,
          "set",
        );
      }
    }
  }

  if (session.pendingProductPick && session.lastProducts.length) {
    if (isNegative(text)) {
      clearProductPickPending(session);
      touchBotSession(session);
      return {
        sessionId: session.id,
        reply:
          "No problem. Say **categories**, search another product, or type a new name.",
        cart: session.cart,
        quickReplies,
        navActions: BROWSE_NAV_ACTIONS,
      };
    }
    if (isAffirmative(text)) {
      const product = session.lastProducts[0];
      if (product) {
        clearProductPickPending(session);
        return addProductToCart(session, product, 1, undefined, quickReplies);
      }
    }
    const pickIndex =
      parseProductPickIndex(text, session.lastProducts.length) ?? null;
    if (pickIndex) {
      const product = pickProductFromSession(session, pickIndex);
      if (product) return productPickReply(session, product);
    }
  }

  if (session.lastProducts.length > 0 && isAffirmative(text)) {
    const product = session.lastProducts[0];
    clearProductPickPending(session);
    return addProductToCart(session, product, 1, undefined, quickReplies);
  }

  if (isOrderTrackingIntent(text)) {
    return buildTrackOrdersResponse(session, text);
  }

  return null;
}

export async function handleOrderBotMessage(input: {
  message: string;
  sessionId?: string;
  clientId: string;
  clientEmail: string;
}): Promise<BotChatResponse> {
  const session = getBotSession(
    input.sessionId,
    input.clientId,
    input.clientEmail,
  );
  if (!session.cart.length) {
    await hydrateBotCartFromStore(session);
  }
  const text = input.message.trim();

  const preLlm = await tryPreLlmOrderBotHandlers(session, text);
  if (preLlm) return preLlm;

  const llmReply = await tryHandleOrderBotWithLlm({
    ...input,
    sessionId: session.id,
  });
  if (llmReply) return llmReply;

  const lower = text.toLowerCase();
  const quickReplies = DEFAULT_QUICK_REPLIES;

  if (isVulgarMessage(text)) {
    touchBotSession(session);
    return {
      sessionId: session.id,
      reply: vulgarRefusal(),
      cart: session.cart,
      quickReplies,
    };
  }

  if (!text || /^(hi|hello|hey|namaste)$/i.test(lower)) {
    touchBotSession(session);
    return {
      sessionId: session.id,
      reply:
        "Hi! I'm your Sarjan order assistant. Ask about products, say **categories**, or type a product name — I'll guide you to add sets and **place order**.",
      cart: session.cart,
      quickReplies,
    };
  }

  if (/^help$/i.test(lower)) {
    touchBotSession(session);
    return {
      sessionId: session.id,
      reply: helpMessage(),
      cart: session.cart,
      quickReplies,
    };
  }

  const looseQty = tryParseLooseSetQuantity(text);
  if (looseQty && session.lastProducts.length) {
    const focusIndex =
      session.focusProductIndex ??
      (session.lastProducts.length === 1 ? 1 : null);
    if (focusIndex) {
      const product = session.lastProducts[focusIndex - 1];
      if (product) {
        return addProductToCart(
          session,
          product,
          looseQty,
          undefined,
          quickReplies,
        );
      }
    }
  }

  const policyQa = answerWebsitePolicyQuestion(text);
  if (policyQa) {
    touchBotSession(session);
    return {
      sessionId: session.id,
      reply: policyQa,
      cart: session.cart,
      quickReplies: [
        "Payment terms",
        "Shipping policy",
        "How to order",
        ...quickReplies,
      ].slice(0, 4),
    };
  }

  const qa = answerCatalogQuestion(session, text);
  if (qa) {
    touchBotSession(session);
    return {
      sessionId: session.id,
      reply: qa,
      cart: session.cart,
      quickReplies,
    };
  }

  if (session.lastProducts.length && !session.pendingProductPick) {
    const byName = resolveProductFromSession(text, session.lastProducts);
    if (byName && text.length > 2 && !/^add\s+/i.test(text)) {
      session.focusProductIndex = byName.index;
      clearProductPickPending(session);
      return productPickReply(session, byName);
    }
  }

  if (
    /^categories?$|^list categories$/i.test(lower) ||
    /category dikhao/i.test(lower)
  ) {
    clearProductPickPending(session);
    const categoryPreviews = await listBotCategoryPreviews();
    touchBotSession(session);
    const lines = categoryPreviews.map((item) => {
      if (item.kind === "collection") {
        const short = item.name.replace(/\s+collection$/i, "");
        return `• **${item.name}** — reply **show ${short}**`;
      }
      return `• ${item.name} (${item.count} products)`;
    });
    return {
      sessionId: session.id,
      reply: categoryPreviews.length
        ? `**Browse the catalog:**\n${lines.join("\n")}\n\nReply with **show Ajrakh** or **show Kurtas** to see products.`
        : "No categories in catalog yet.",
      categories: categoryPreviews.map((item) => item.name),
      categoryPreviews,
      cart: session.cart,
      quickReplies: categoryPreviews.slice(0, 4).map((item) => {
        const short = item.name.replace(/\s+collection$/i, "");
        return `Show ${short}`;
      }),
      navActions: BROWSE_NAV_ACTIONS,
    };
  }

  if (/^cart$|^my cart$|^show cart$/i.test(lower)) {
    const { cart, total } = await hydrateBotCartFromStore(session);
    touchBotSession(session);
    return {
      sessionId: session.id,
      reply: cart.length
        ? `Your cart — **${money(total)}** estimated total. Lines below. Say **place order** when ready.`
        : formatCart(cart, total),
      cart,
      cartTotal: total,
      quickReplies,
    };
  }

  if (/^clear cart$/i.test(lower)) {
    session.cart = [];
    await persistBotCartToStore(session);
    touchBotSession(session);
    return {
      sessionId: session.id,
      reply: "Cart cleared.",
      cart: [],
      cartTotal: 0,
      quickReplies,
    };
  }

  const addMatch = text.match(
    /^add\s+(.+?)\s+(\d+)\s*(?:sets?|set)?(?:\s+color\s+(.+))?$/i,
  );
  if (addMatch) {
    const productToken = addMatch[1].trim();
    const setQuantity = Math.max(1, Number(addMatch[2]) || 1);
    const colorOverride = addMatch[3]?.trim();
    const product = resolveProductFromSession(
      productToken,
      session.lastProducts,
    );
    if (!product) {
      touchBotSession(session);
      return {
        sessionId: session.id,
        reply:
          "Could not find that product. Browse a category first, then use **add 2 3 sets** (product number, then sets — e.g. add 2 3 sets).",
        cart: session.cart,
        quickReplies,
        navActions: BROWSE_NAV_ACTIONS,
      };
    }
    return addProductToCart(
      session,
      product,
      setQuantity,
      colorOverride,
      quickReplies,
    );
  }

  if (
    /^place order$|^submit order$|^confirm order$/i.test(lower) ||
    /order place/i.test(lower)
  ) {
    try {
      const order = await placeBotOrder(session);
      const placedOrder = await buildOrderPreview(session.clientId, order);
      touchBotSession(session);
      return {
        sessionId: session.id,
        reply: `Order **${order.id}** submitted (${money(order.subtotal)}). Status: **${order.status}**. Tap **View order details** below for the full breakdown.`,
        orderPlaced: true,
        orderId: order.id,
        placedOrder,
        orders: [placedOrder],
        navActions: orderPlacedNavActions(order.id),
        cart: [],
        cartTotal: 0,
        quickReplies: ["My orders", "Categories"],
      };
    } catch (error) {
      touchBotSession(session);
      return {
        sessionId: session.id,
        reply:
          error instanceof Error ? error.message : "Could not place order.",
        cart: session.cart,
        quickReplies,
      };
    }
  }

  const searchMatch = text.match(/^search\s+(.+)$/i);
  if (searchMatch) {
    const products = await searchBotProducts(session.clientId, {
      q: searchMatch[1].trim(),
      limit: 8,
    });
    session.lastProducts = products;
    markProductPickPending(session);
    touchBotSession(session);
    return {
      sessionId: session.id,
      reply: productsCardsIntro(products, { didYouMean: true }),
      products,
      cart: session.cart,
      quickReplies: ["Yes", "Add 1 1 sets", "Cart", "Place order"],
    };
  }

  const categories = await listBotCategories();

  if (shouldBrowseCatalog(text, categories)) {
    const categoryQuery = resolveCatalogSearchTerm(text, categories);
    const browse = await browseBotCatalog(
      session.clientId,
      categoryQuery,
      categories,
    );
    session.lastCategory = browse.label;
    session.lastProducts = browse.products;
    markProductPickPending(session);
    touchBotSession(session);
    const empty = !browse.products.length;
    return {
      sessionId: session.id,
      reply: productsCardsIntro(browse.products, {
        label: browse.label,
        collectionHref: browse.collectionHref,
      }),
      products: browse.products,
      cart: session.cart,
      quickReplies: empty
        ? ["Categories", "Show Ajrakh", "Show Kurtas"]
        : browse.products.slice(0, 3).map((item) => `Add ${item.index} 1 sets`),
      navActions: empty
        ? [
            ...BROWSE_NAV_ACTIONS,
            ...(browse.collectionHref
              ? [
                  {
                    label: `View ${browse.label}`,
                    href: browse.collectionHref,
                  },
                ]
              : []),
          ]
        : browse.collectionHref
          ? [
              {
                label: `View ${browse.label}`,
                href: browse.collectionHref,
              },
            ]
          : undefined,
    };
  }

  const searchTerm =
    extractBrowseSubject(text).length >= 2 ? extractBrowseSubject(text) : text;
  const fuzzyProducts = await searchBotProducts(session.clientId, {
    q: searchTerm,
    limit: 6,
  });
  if (!fuzzyProducts.length && searchTerm !== text) {
    const retry = await searchBotProducts(session.clientId, {
      q: text,
      limit: 6,
    });
    if (retry.length) {
      session.lastProducts = retry;
      markProductPickPending(session);
      touchBotSession(session);
      return {
        sessionId: session.id,
        reply: productsCardsIntro(retry, { didYouMean: true }),
        products: retry,
        cart: session.cart,
        quickReplies: ["Yes", "Add 1 1 sets", ...quickReplies.slice(0, 2)],
      };
    }
  }
  if (fuzzyProducts.length) {
    session.lastProducts = fuzzyProducts;
    markProductPickPending(session);
    touchBotSession(session);
    return {
      sessionId: session.id,
      reply: productsCardsIntro(fuzzyProducts, {
        label: fuzzyProducts.length === 1 ? fuzzyProducts[0].name : undefined,
        didYouMean: fuzzyProducts.length > 1,
      }),
      products: fuzzyProducts,
      cart: session.cart,
      quickReplies: ["Yes", "Add 1 1 sets", ...quickReplies.slice(0, 2)],
    };
  }

  touchBotSession(session);
  return {
    sessionId: session.id,
    reply: contextualFallback(session, text),
    cart: session.cart,
    quickReplies,
    navActions: BROWSE_NAV_ACTIONS,
  };
}
