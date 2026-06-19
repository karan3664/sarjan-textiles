import { appendAiChatMessage, recordAiSessionEvent } from "@/lib/ai-chat/store";
import type { AiLanguage, AiSource } from "@/lib/ai-chat/types";
import { welcomeCopy } from "@/lib/ai-chat/welcome";
import type { BotChatResponse } from "@/lib/order-bot/types";
import type { BotSession } from "@/lib/order-bot/session-store";

export async function persistBotExchange(
  session: BotSession,
  userMessage: string,
  assistantReply: string,
  metadata?: Record<string, unknown>,
) {
  await appendAiChatMessage({
    sessionId: session.id,
    role: "user",
    content: userMessage,
  });
  await appendAiChatMessage({
    sessionId: session.id,
    role: "assistant",
    content: assistantReply,
    metadata,
  });
}

export async function trackBotEvent(
  session: BotSession,
  eventType: Parameters<typeof recordAiSessionEvent>[0]["eventType"],
  extra?: { productSlug?: string; metadata?: Record<string, unknown> },
) {
  await recordAiSessionEvent({
    sessionId: session.id,
    clientId: session.clientId,
    eventType,
    productSlug: extra?.productSlug,
    metadata: extra?.metadata,
  });

  const memoryType =
    eventType === "product_viewed"
      ? "product_view"
      : eventType === "add_to_cart"
        ? "add_to_cart"
        : eventType === "order_placed"
          ? "order"
          : null;
  if (!memoryType) return;

  try {
    const { mirrorBotEventToMemory } = await import("@/lib/ai-memory/engine");
    await mirrorBotEventToMemory({
      clientId: session.clientId,
      eventType: memoryType,
      source: session.source,
      sessionId: session.id,
      productSlug: extra?.productSlug,
      searchQuery:
        typeof extra?.metadata?.query === "string"
          ? extra.metadata.query
          : undefined,
      category:
        typeof extra?.metadata?.category === "string"
          ? extra.metadata.category
          : undefined,
      quantity:
        typeof extra?.metadata?.quantity === "number"
          ? extra.metadata.quantity
          : undefined,
    });
  } catch {
    /* memory is best-effort */
  }
}

export function buildClosingPromptResponse(
  session: BotSession,
): BotChatResponse {
  const copy = welcomeCopy(session.language);
  return {
    sessionId: session.id,
    reply: copy.closingPrompt,
    language: session.language,
    sessionPhase: "closing",
    quickReplies: ["Yes", "No"],
  };
}

export function buildRatingPromptResponse(
  session: BotSession,
): BotChatResponse {
  const copy = welcomeCopy(session.language);
  return {
    sessionId: session.id,
    reply: copy.ratingPrompt,
    language: session.language,
    sessionPhase: "awaiting_rating",
    showRating: true,
  };
}

export function isClosingDecline(text: string, language: AiLanguage) {
  const lower = text.trim().toLowerCase();
  const declines = [
    "no",
    "nope",
    "nah",
    "nahi",
    "na",
    "nothing",
    "that's all",
    "thats all",
    "bas",
    "close",
    "done",
    "bye",
    "goodbye",
  ];
  if (language === "hi") declines.push("नहीं", "बस");
  return declines.some(
    (word) => lower === word || lower.startsWith(`${word} `),
  );
}

export function isClosingAccept(text: string) {
  const lower = text.trim().toLowerCase();
  return ["yes", "yeah", "yep", "haan", "ha", "ok", "okay", "sure"].includes(
    lower,
  );
}

export function normalizeAiLanguage(value: unknown): AiLanguage {
  const raw = String(value ?? "en")
    .trim()
    .toLowerCase();
  if (raw === "hi" || raw === "hindi") return "hi";
  if (raw === "hinglish") return "hinglish";
  return "en";
}

export function normalizeAiSource(value: unknown): AiSource {
  return String(value ?? "web")
    .trim()
    .toLowerCase() === "app"
    ? "app"
    : "web";
}
