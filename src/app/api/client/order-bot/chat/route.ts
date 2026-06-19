import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import {
  normalizeAiLanguage,
  normalizeAiSource,
  persistBotExchange,
  trackBotEvent,
} from "@/lib/ai-chat/session-lifecycle";
import { handleOrderBotMessage } from "@/lib/order-bot/engine";
import { flushBotSessionById } from "@/lib/order-bot/session-store";

export async function POST(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  let body: {
    message?: string;
    sessionId?: string;
    language?: string;
    source?: string;
    pageContext?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  const language = normalizeAiLanguage(body.language);
  const source = normalizeAiSource(body.source);

  try {
    const result = await handleOrderBotMessage({
      message,
      sessionId: body.sessionId?.trim(),
      clientId: auth.session.clientId,
      clientEmail: auth.session.email,
      clientName: auth.client.companyName,
      language,
      source,
      pageContext: body.pageContext,
    });

    await flushBotSessionById(result.sessionId, auth.session.clientId);

    await persistBotExchange(
      {
        id: result.sessionId,
        clientId: auth.session.clientId,
        clientEmail: auth.session.email,
        language,
        source,
        cart: result.cart ?? [],
        lastProducts: result.products ?? [],
        chatHistory: [],
        updatedAt: Date.now(),
      },
      message,
      result.reply,
      {
        products: result.products?.length ?? 0,
        orderPlaced: result.orderPlaced ?? false,
      },
    );

    if (result.products?.length) {
      await trackBotEvent(
        {
          id: result.sessionId,
          clientId: auth.session.clientId,
          clientEmail: auth.session.email,
          language,
          source,
          cart: [],
          lastProducts: [],
          chatHistory: [],
          updatedAt: Date.now(),
        },
        "product_recommended",
        { metadata: { count: result.products.length } },
      );
    }

    if (result.orderPlaced) {
      await trackBotEvent(
        {
          id: result.sessionId,
          clientId: auth.session.clientId,
          clientEmail: auth.session.email,
          language,
          source,
          cart: [],
          lastProducts: [],
          chatHistory: [],
          updatedAt: Date.now(),
        },
        "order_placed",
        { metadata: { orderId: result.orderId } },
      );
    }

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Chat failed",
      },
      { status: 500 },
    );
  }
}
