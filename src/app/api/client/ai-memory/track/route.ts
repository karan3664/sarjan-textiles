import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import {
  normalizeAiSource,
  trackBotEvent,
} from "@/lib/ai-chat/session-lifecycle";
import { trackAiMemoryEvent } from "@/lib/ai-memory/store";
import type { AiMemoryEventType } from "@/lib/ai-memory/types";

export async function POST(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  let body: {
    eventType?: string;
    source?: string;
    productSlug?: string;
    category?: string;
    searchQuery?: string;
    quantity?: number;
    budgetInr?: number;
    sessionId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = String(body.eventType ?? "").trim() as AiMemoryEventType;
  if (!["search", "product_view", "add_to_cart", "order"].includes(eventType)) {
    return Response.json({ error: "Invalid eventType" }, { status: 400 });
  }

  const source = normalizeAiSource(body.source);
  const interest = await trackAiMemoryEvent({
    clientId: auth.session.clientId,
    eventType,
    source,
    productSlug: body.productSlug?.trim(),
    category: body.category?.trim(),
    searchQuery: body.searchQuery?.trim(),
    quantity: body.quantity,
    budgetInr: body.budgetInr,
    sessionId: body.sessionId?.trim(),
  });

  if (body.sessionId?.trim()) {
    const botEvent =
      eventType === "product_view"
        ? "product_viewed"
        : eventType === "add_to_cart"
          ? "add_to_cart"
          : eventType === "order"
            ? "order_placed"
            : null;
    if (botEvent) {
      await trackBotEvent(
        {
          id: body.sessionId.trim(),
          clientId: auth.session.clientId,
          clientEmail: auth.session.email,
          language: "en",
          source,
          cart: [],
          lastProducts: [],
          chatHistory: [],
          updatedAt: Date.now(),
        },
        botEvent,
        {
          productSlug: body.productSlug?.trim(),
          metadata: {
            category: body.category,
            query: body.searchQuery,
            quantity: body.quantity,
          },
        },
      );
    }
  }

  return Response.json({ ok: true, interest });
}
