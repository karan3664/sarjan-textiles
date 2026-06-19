import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import {
  closeAiChatSession,
  createAiChatSession,
  getAiChatSession,
  getAiUserPreferences,
  recordAiSessionEvent,
} from "@/lib/ai-chat/store";
import {
  normalizeAiLanguage,
  normalizeAiSource,
} from "@/lib/ai-chat/session-lifecycle";
import { buildWelcomeMessage } from "@/lib/ai-chat/welcome";
import { captureAbandonedPurchaseIntent } from "@/lib/ai-memory/abandoned-intent";
import { getClient } from "@/lib/local-db";

export async function POST(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  let body: { language?: string; source?: string; resumeSessionId?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const prefs = await getAiUserPreferences(auth.session.clientId);
  const language = normalizeAiLanguage(
    body.language ?? prefs?.language ?? "en",
  );
  const source = normalizeAiSource(body.source);

  if (body.resumeSessionId) {
    const existing = await getAiChatSession(
      body.resumeSessionId,
      auth.session.clientId,
    );
    if (existing && existing.status !== "closed") {
      const client = await getClient(auth.session.clientId);
      const clientName =
        client?.companyName?.trim() || client?.email?.split("@")[0] || "there";
      const welcome = buildWelcomeMessage(existing.language, clientName);
      return Response.json({
        sessionId: existing.id,
        language: existing.language,
        source: existing.source,
        status: existing.status,
        welcome: welcome.text,
        quickActions: welcome.quickActions,
        clientName,
        resumed: true,
      });
    }
  }

  const session = await createAiChatSession({
    clientId: auth.session.clientId,
    language,
    source,
  });

  await recordAiSessionEvent({
    sessionId: session.id,
    clientId: auth.session.clientId,
    eventType: "session_started",
    metadata: { source, language },
  });

  const client = await getClient(auth.session.clientId);
  const clientName =
    client?.companyName?.trim() || client?.email?.split("@")[0] || "there";
  const welcome = buildWelcomeMessage(language, clientName);

  return Response.json({
    sessionId: session.id,
    language: session.language,
    source: session.source,
    status: session.status,
    welcome: welcome.text,
    quickActions: welcome.quickActions,
    clientName,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  let body: {
    sessionId?: string;
    action?: "close" | "rate";
    rating?: number;
    feedback?: string;
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

  if (body.action === "rate") {
    const rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "rating must be 1–5" }, { status: 400 });
    }
    const closed = await closeAiChatSession({
      sessionId,
      clientId: auth.session.clientId,
      rating,
      feedback: body.feedback,
    });
    if (!closed) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
    await recordAiSessionEvent({
      sessionId,
      clientId: auth.session.clientId,
      eventType: "session_rated",
      metadata: { rating, feedback: body.feedback?.trim() || "" },
    });
    return Response.json({ ok: true, session: closed });
  }

  const closed = await closeAiChatSession({
    sessionId,
    clientId: auth.session.clientId,
    rating: body.rating,
    feedback: body.feedback,
  });
  if (!closed) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const cart = Array.isArray(closed.state?.cart)
    ? (closed.state.cart as Array<{ slug?: string; setQuantity?: number }>)
    : [];
  if (cart.length > 0 && (closed.ordersPlaced ?? 0) < 1) {
    const slugs = cart
      .map((line) => line.slug?.trim())
      .filter((slug): slug is string => Boolean(slug));
    const quantity = cart.reduce(
      (sum, line) => sum + Math.max(0, Number(line.setQuantity ?? 0)),
      0,
    );
    void captureAbandonedPurchaseIntent({
      clientId: auth.session.clientId,
      sessionId,
      source: closed.source,
      interestedProduct: slugs[0],
      productSlugs: slugs,
      quantity: quantity || undefined,
      notes: "Abandoned AI cart on session close",
    }).catch((error) =>
      console.error("Abandoned AI intent capture failed", error),
    );
  }

  await recordAiSessionEvent({
    sessionId,
    clientId: auth.session.clientId,
    eventType: "session_closed",
  });
  return Response.json({ ok: true, session: closed });
}
