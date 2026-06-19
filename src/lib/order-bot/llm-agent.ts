import {
  defaultQuickReplies,
  executeBotTool,
  type BotToolName,
} from "@/lib/order-bot/actions";
import { isVulgarMessage, vulgarRefusal } from "@/lib/order-bot/conversation";
import {
  appendChatHistory,
  getBotSession,
  touchBotSession,
  type BotSession,
} from "@/lib/order-bot/session-store";
import { orderPlacedNavActions } from "@/lib/order-bot/order-placed-ui";
import type { BotChatResponse } from "@/lib/order-bot/types";
import {
  isOrderBotLlmEnabled,
  resolveOpenAiApiKey,
  resolveOrderBotLlmModel,
} from "@/lib/order-bot/openai-env";
import { siteSettings } from "@/data/site";
import { formatPageContextForPrompt } from "@/lib/ai-chat/page-context";

const OPENAI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_categories",
      description:
        "List product categories and collections on Sarjan Textiles.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "browse_products",
      description:
        "Browse products by category or collection name (e.g. Kurtas, Ajrakh, Men's Kurtas).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Category or collection name" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_products",
      description:
        "Search catalog by keyword (product name, fabric, color, etc.).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_to_cart",
      description:
        "Add product to cart using index from the last browse/search list (1-based).",
      parameters: {
        type: "object",
        properties: {
          product_index: {
            type: "number",
            description: "Product number from last list (1, 2, 3...)",
          },
          sets: { type: "number", description: "Number of sets to add" },
          color: { type: "string", description: "Optional color override" },
          replace: {
            type: "boolean",
            description:
              "If true, set total qty (e.g. user said 1 23). If false, add to existing.",
          },
        },
        required: ["product_index", "sets"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_cart_line",
      description:
        "Change set quantity on an existing cart line (use when user wants to update qty, e.g. low stock).",
      parameters: {
        type: "object",
        properties: {
          line_index: {
            type: "number",
            description: "Cart line number from view_cart (1, 2, 3...)",
          },
          sets: { type: "number", description: "New total sets for that line" },
        },
        required: ["line_index", "sets"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "view_cart",
      description: "Show current cart lines and estimated total.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "clear_cart",
      description: "Remove all items from cart.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "place_order",
      description: "Submit B2B order from current cart.",
      parameters: {
        type: "object",
        properties: {
          note: { type: "string", description: "Optional order note" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "track_orders",
      description:
        "List recent orders or get full tracking for one order ID (e.g. ST-1001).",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "Optional order ID like ST-1001",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "recommend_products",
      description:
        "Sales recommendations: similar, bought_together, budget, quantity, upsell, or cross_sell.",
      parameters: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: [
              "similar",
              "bought_together",
              "budget",
              "quantity",
              "upsell",
              "cross_sell",
            ],
          },
          product_slug: {
            type: "string",
            description: "Reference product slug",
          },
          budget_inr: { type: "number", description: "Client budget in INR" },
          target_sets: { type: "number", description: "Desired set quantity" },
        },
        required: ["kind"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "optimize_cart",
      description:
        "Analyze cart for shipping slab optimization (e.g. add pieces to save shipping).",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "capture_lead",
      description:
        "Capture wholesale lead interest: product, quantity, budget for sales follow-up.",
      parameters: {
        type: "object",
        properties: {
          product_interest: { type: "string" },
          product_slugs: { type: "array", items: { type: "string" } },
          quantity_interest: { type: "number" },
          budget_inr: { type: "number" },
          notes: { type: "string" },
          status: { type: "string", enum: ["new", "qualified", "lost"] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "website_info",
      description:
        "Official Sarjan website policies and help: payment/credit, shipping/dispatch, terms, B2B process, collections, FAQs, refunds, contact, MOQ, registration, tracking, page list. Use for any non-catalog site question.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: [
              "contact",
              "credit",
              "payment",
              "moq",
              "register",
              "tracking",
              "pages",
              "shipping",
              "terms",
              "process",
              "collections",
              "faq",
              "refund",
              "general",
            ],
          },
        },
        required: ["topic"],
        additionalProperties: false,
      },
    },
  },
];

type OpenAIMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

function systemPrompt(
  pageContext?: import("@/lib/ai-chat/page-context").AiPageContext,
  client?: { email?: string; companyName?: string },
) {
  const contextBlock = formatPageContextForPrompt(pageContext);
  const clientBlock = client?.email?.trim()
    ? [
        "SIGNED-IN CLIENT (already authenticated on the website — never ask them to log in or register):",
        `• Email: ${client.email.trim()}`,
        ...(client.companyName?.trim()
          ? [`• Company: ${client.companyName.trim()}`]
          : []),
        "• Use place_order, view_cart, track_orders, and catalog tools directly.",
        "",
      ].join("\n")
    : "";
  return [
    `You are the live AI assistant for ${siteSettings.brandName} (${siteSettings.domain}) — a B2B textile wholesale storefront.`,
    "",
    ...(clientBlock ? [clientBlock] : []),
    ...(contextBlock
      ? [
          "PAGE CONTEXT (use this when the user refers to “this page” or “this product”):",
          contextBlock,
          "",
        ]
      : []),
    "SCOPE (only these topics):",
    "• Product catalog: categories, collections, search, prices per set, MOQ, stock",
    "• Cart and placing wholesale orders for the logged-in approved client",
    "• Order tracking: status, dispatch, LR/transport, payment — ONLY this client's orders",
    "• Website help: payment terms, credit, shipping/dispatch, terms & conditions, B2B process, collections, FAQs, refunds, contact, registration, /account, /order-tracking",
    "",
    "RULES:",
    "• For payment, shipping, terms, process, collections, or FAQ questions — call **website_info** with the right topic. Summarize tool output; add page links (/faqs, /terms, /shipping-policy, /process).",
    "• Always use tools for catalog, cart, orders, and site facts — never invent SKUs, prices, order IDs, or policy details.",
    "• Product cards have **Add 25/50/100** buttons — guide users to those instead of typing product numbers.",
    "• When user mentions budget or quantity, call **recommend_products** with kind=budget or kind=quantity.",
    "• Proactively suggest **recommend_products** (similar, upsell, cross_sell) after browse/search.",
    "• After cart changes or before place order, call **optimize_cart** when cart has items.",
    "• When user shares buying intent without ordering, call **capture_lead** with product_interest, budget_inr, quantity_interest.",
    "• When the user says yes/haan/ok after products, call add_to_cart with appropriate sets.",
    "• Low stock: add_to_cart/update_cart_line auto-cap qty; explain the adjustment to the user.",
    "• To change cart qty: update_cart_line (line_index, sets) or user says **update cart 1 30**.",
    "• Speak naturally like ChatGPT. Match Hindi, English, or Hinglish.",
    "• Use **bold** for product names and order IDs. Keep replies concise but complete.",
    "• After browse_products, search_products, track_orders, or view_cart: the chat UI shows photo cards — do NOT paste numbered product lists or order bullet lists in your reply (one short intro sentence only).",
    "• Refuse off-topic requests (other brands, general knowledge, code, politics) — redirect politely to Sarjan ordering.",
    "• Refuse vulgar or abusive messages.",
    "• Never tell an approved signed-in client to log in — they are already authenticated in this chat.",
    `• Credit term: ${siteSettings.creditTermDays} days for approved clients. Orders need admin approval.`,
  ].join("\n");
}

async function callOpenAI(messages: OpenAIMessage[]) {
  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const model = resolveOrderBotLlmModel();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: OPENAI_TOOLS,
      tool_choice: "auto",
      temperature: 0.55,
      max_tokens: 900,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `OpenAI ${res.status}: ${text.slice(0, 280) || res.statusText}`,
    );
  }

  let json: {
    choices?: Array<{ message?: OpenAIMessage & { tool_calls?: ToolCall[] } }>;
  };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  const message = json.choices?.[0]?.message;
  if (!message) throw new Error("OpenAI returned no message");
  return message;
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function sessionToResponse(
  session: BotSession,
  reply: string,
): BotChatResponse {
  touchBotSession(session);
  const placedOrderId = session.lastPlacedOrderId;
  if (placedOrderId) {
    session.lastPlacedOrderId = undefined;
  }
  const orderPreviews = session.lastOrderPreviews;
  if (orderPreviews?.length) {
    session.lastOrderPreviews = undefined;
  }
  const placedOrder =
    placedOrderId && orderPreviews?.length
      ? (orderPreviews.find((order) => order.id === placedOrderId) ??
        orderPreviews[0])
      : undefined;
  const cartTotal = session.cart.reduce(
    (sum, line) => sum + (line.lineTotal ?? 0),
    0,
  );

  const showProductCards = Boolean(
    session.attachProductCards && session.lastProducts.length,
  );
  if (session.attachProductCards) session.attachProductCards = undefined;

  const showCartCards = Boolean(session.attachCartCards);
  if (session.attachCartCards) session.attachCartCards = undefined;

  const salesSuggestions = session.attachSalesSuggestions;
  if (session.attachSalesSuggestions)
    session.attachSalesSuggestions = undefined;

  const cartOptimization = session.attachCartOptimization;
  if (session.attachCartOptimization)
    session.attachCartOptimization = undefined;

  let finalReply = reply;
  if (orderPreviews?.length) {
    finalReply =
      orderPreviews.length === 1
        ? `**${orderPreviews[0].id}** — **${orderPreviews[0].status}**, ${money(orderPreviews[0].subtotal)}. Items below:`
        : `Your **${orderPreviews.length}** recent orders (newest first):`;
  } else if (showProductCards) {
    const label = session.lastCategory ? `**${session.lastCategory}** — ` : "";
    finalReply = `${label}${session.lastProducts.length} product(s) below. Use the card buttons to view details or add sets.`;
  } else if (cartOptimization && !showCartCards) {
    finalReply = cartOptimization.message;
  } else if (showCartCards) {
    finalReply = cartOptimization
      ? `${cartOptimization.message}\n\nYour cart — **${money(cartTotal)}** estimated total.`
      : `Your cart — **${money(cartTotal)}** estimated total. Lines below.`;
  }

  return {
    sessionId: session.id,
    reply: finalReply,
    products: showProductCards ? session.lastProducts : undefined,
    cart: placedOrderId ? [] : showCartCards ? session.cart : undefined,
    cartTotal: placedOrderId ? 0 : showCartCards ? cartTotal : undefined,
    orders: orderPreviews?.length ? orderPreviews : undefined,
    salesSuggestions: salesSuggestions?.length ? salesSuggestions : undefined,
    cartOptimization: cartOptimization ?? undefined,
    quickReplies: placedOrderId
      ? ["My orders", "Categories"]
      : defaultQuickReplies(session),
    ...(placedOrderId
      ? {
          orderPlaced: true,
          orderId: placedOrderId,
          placedOrder,
          navActions: orderPlacedNavActions(placedOrderId),
        }
      : {
          navActions:
            session.lastProducts.length || session.cart.length
              ? undefined
              : [
                  { label: "Browse products", href: "/products" },
                  { label: "Order tracking", href: "/order-tracking" },
                  { label: "Your account", href: "/account" },
                ],
        }),
  };
}

export async function tryHandleOrderBotWithLlm(input: {
  message: string;
  sessionId?: string;
  clientId: string;
  clientEmail: string;
  clientName?: string;
}): Promise<BotChatResponse | null> {
  if (!isOrderBotLlmEnabled()) return null;

  const session = await getBotSession({
    sessionId: input.sessionId,
    clientId: input.clientId,
    clientEmail: input.clientEmail,
  });
  const text = input.message.trim();
  if (!text) return null;

  if (isVulgarMessage(text)) {
    return sessionToResponse(session, vulgarRefusal());
  }

  appendChatHistory(session, "user", text);

  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: systemPrompt(session.pageContext, {
        email: input.clientEmail,
        companyName: input.clientName,
      }),
    },
    ...session.chatHistory.map((entry) => ({
      role: entry.role,
      content: entry.content,
    })),
  ];

  try {
    for (let step = 0; step < 8; step++) {
      const assistant = await callOpenAI(messages);

      if (assistant.tool_calls?.length) {
        messages.push({
          role: "assistant",
          content: assistant.content ?? null,
          tool_calls: assistant.tool_calls,
        });

        for (const call of assistant.tool_calls) {
          const name = call.function.name as BotToolName;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}") as Record<
              string,
              unknown
            >;
          } catch {
            args = {};
          }
          const result = await executeBotTool(session, name, args);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: result,
          });
        }
        continue;
      }

      const reply =
        assistant.content?.trim() ||
        "I'm here to help with Sarjan products, cart, orders, and tracking. What would you like?";

      appendChatHistory(session, "assistant", reply);
      return sessionToResponse(session, reply);
    }

    appendChatHistory(
      session,
      "assistant",
      "I need one more detail — which product or order ID should I use?",
    );
    return sessionToResponse(
      session,
      "I need one more detail — which product or order ID should I use?",
    );
  } catch (error) {
    console.error("Order bot LLM failed", error);
    const last = session.chatHistory.at(-1);
    if (last?.role === "user" && last.content === text) {
      session.chatHistory.pop();
      touchBotSession(session);
    }
    return null;
  }
}
