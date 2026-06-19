import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { handleOrderBotAction } from "@/lib/order-bot/engine";
import {
  normalizeAiLanguage,
  normalizeAiSource,
  persistBotExchange,
} from "@/lib/ai-chat/session-lifecycle";

export async function POST(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  let body: {
    sessionId?: string;
    action?: "add_to_cart" | "view_product";
    productIndex?: number;
    productSlug?: string;
    sets?: number;
    language?: string;
    source?: string;
    pageContext?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }
  const action = body.action;
  if (action !== "add_to_cart" && action !== "view_product") {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }
  const productIndex = Number(body.productIndex);
  if (!Number.isFinite(productIndex) || productIndex < 1) {
    return Response.json(
      { error: "productIndex is required" },
      { status: 400 },
    );
  }

  try {
    const result = await handleOrderBotAction({
      sessionId,
      clientId: auth.session.clientId,
      clientEmail: auth.session.email,
      language: normalizeAiLanguage(body.language),
      source: normalizeAiSource(body.source),
      pageContext: body.pageContext,
      action,
      productIndex,
      productSlug: body.productSlug?.trim(),
      sets: body.sets,
    });
    const userLabel =
      action === "view_product"
        ? `View product #${productIndex}`
        : `Add ${body.sets ?? 25} sets to product #${productIndex}`;
    await persistBotExchange(
      {
        id: sessionId,
        clientId: auth.session.clientId,
        clientEmail: auth.session.email,
        language: normalizeAiLanguage(body.language),
        source: normalizeAiSource(body.source),
        cart: result.cart ?? [],
        lastProducts: result.products ?? [],
        chatHistory: [],
        updatedAt: Date.now(),
      },
      userLabel,
      result.reply,
      { action, productIndex, sets: body.sets },
    );
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Action failed",
      },
      { status: 500 },
    );
  }
}
