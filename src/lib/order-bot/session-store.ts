import { randomUUID } from "crypto";
import type {
  BotCartLine,
  BotOrderPreview,
  BotProductPreview,
} from "@/lib/order-bot/types";

export type BotSession = {
  id: string;
  clientId: string;
  clientEmail: string;
  cart: BotCartLine[];
  lastProducts: BotProductPreview[];
  lastCategory?: string;
  /** User was shown a product list or "did you mean" — accept yes / 1 / add N sets */
  pendingProductPick?: boolean;
  /** Last product the user confirmed or asked about */
  focusProductIndex?: number;
  /** Recent turns for OpenAI chat (user + assistant text only) */
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>;
  /** Set when place_order succeeds; consumed on next chat response */
  lastPlacedOrderId?: string;
  /** Order cards for track / my orders (consumed on next chat response) */
  lastOrderPreviews?: BotOrderPreview[];
  /** Next assistant bubble should show product image cards (browse/search) */
  attachProductCards?: boolean;
  /** Next assistant bubble should show cart line cards (view_cart) */
  attachCartCards?: boolean;
  updatedAt: number;
};

const MAX_CHAT_HISTORY = 24;

const sessions = new Map<string, BotSession>();
const TTL_MS = 1000 * 60 * 60 * 4;

function pruneSessions() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, session] of sessions) {
    if (session.updatedAt < cutoff) sessions.delete(id);
  }
}

export function getBotSession(
  sessionId: string | undefined,
  clientId: string,
  clientEmail: string,
) {
  pruneSessions();
  const existing = sessionId ? sessions.get(sessionId) : undefined;
  if (existing && existing.clientId === clientId) {
    existing.updatedAt = Date.now();
    if (!existing.chatHistory) existing.chatHistory = [];
    return existing;
  }
  const session: BotSession = {
    id: randomUUID(),
    clientId,
    clientEmail,
    cart: [],
    lastProducts: [],
    chatHistory: [],
    updatedAt: Date.now(),
  };
  sessions.set(session.id, session);
  return session;
}

export function touchBotSession(session: BotSession) {
  session.updatedAt = Date.now();
  sessions.set(session.id, session);
}

export function appendChatHistory(
  session: BotSession,
  role: "user" | "assistant",
  content: string,
) {
  const trimmed = content.trim();
  if (!trimmed) return;
  if (!session.chatHistory) session.chatHistory = [];
  session.chatHistory.push({ role, content: trimmed });
  if (session.chatHistory.length > MAX_CHAT_HISTORY) {
    session.chatHistory = session.chatHistory.slice(-MAX_CHAT_HISTORY);
  }
  touchBotSession(session);
}
