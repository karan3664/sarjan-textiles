import { randomUUID } from "crypto";
import {
  createAiChatSession,
  getAiChatSession,
  hydrateBotSessionFromState,
  serializeBotSessionState,
  touchAiChatSession,
} from "@/lib/ai-chat/store";
import type { AiLanguage, AiSource } from "@/lib/ai-chat/types";
import type {
  BotCartLine,
  BotOrderPreview,
  BotProductPreview,
} from "@/lib/order-bot/types";

export type BotSession = {
  id: string;
  clientId: string;
  clientEmail: string;
  language: AiLanguage;
  source: AiSource;
  cart: BotCartLine[];
  lastProducts: BotProductPreview[];
  lastCategory?: string;
  pendingProductPick?: boolean;
  focusProductIndex?: number;
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>;
  lastPlacedOrderId?: string;
  lastOrderPreviews?: BotOrderPreview[];
  attachProductCards?: boolean;
  attachCartCards?: boolean;
  lifecyclePhase?: "active" | "closing" | "awaiting_rating";
  salesBudgetInr?: number;
  salesTargetSets?: number;
  lastLeadId?: string;
  attachSalesSuggestions?: import("@/lib/ai-sales/types").BotSalesSuggestion[];
  attachCartOptimization?: import("@/lib/ai-sales/types").BotCartOptimization;
  pageContext?: import("@/lib/ai-chat/page-context").AiPageContext;
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

function baseSession(
  id: string,
  clientId: string,
  clientEmail: string,
  language: AiLanguage,
  source: AiSource,
): BotSession {
  return {
    id,
    clientId,
    clientEmail,
    language,
    source,
    cart: [],
    lastProducts: [],
    chatHistory: [],
    updatedAt: Date.now(),
  };
}

export async function getBotSession(input: {
  sessionId?: string;
  clientId: string;
  clientEmail: string;
  language?: AiLanguage;
  source?: AiSource;
  createIfMissing?: boolean;
}): Promise<BotSession> {
  pruneSessions();
  const language = input.language ?? "en";
  const source = input.source ?? "web";

  const cached = input.sessionId ? sessions.get(input.sessionId) : undefined;
  if (cached && cached.clientId === input.clientId) {
    cached.updatedAt = Date.now();
    if (input.language) cached.language = input.language;
    if (input.source) cached.source = input.source;
    if (!cached.chatHistory) cached.chatHistory = [];
    return cached;
  }

  if (input.sessionId) {
    const persisted = await getAiChatSession(input.sessionId, input.clientId);
    if (persisted && persisted.status !== "closed") {
      const session = baseSession(
        persisted.id,
        input.clientId,
        input.clientEmail,
        persisted.language,
        persisted.source,
      );
      hydrateBotSessionFromState(session, persisted.state);
      sessions.set(session.id, session);
      return session;
    }
  }

  if (input.createIfMissing === false) {
    const fallback = baseSession(
      input.sessionId ?? randomUUID(),
      input.clientId,
      input.clientEmail,
      language,
      source,
    );
    sessions.set(fallback.id, fallback);
    return fallback;
  }

  const created = await createAiChatSession({
    clientId: input.clientId,
    language,
    source,
    state: {},
  });
  const session = baseSession(
    created.id,
    input.clientId,
    input.clientEmail,
    created.language,
    created.source,
  );
  sessions.set(session.id, session);
  return session;
}

export function touchBotSession(session: BotSession) {
  session.updatedAt = Date.now();
  sessions.set(session.id, session);
  void touchAiChatSession(session.id, {
    state: serializeBotSessionState(session),
  });
}

export async function flushBotSession(session: BotSession): Promise<void> {
  session.updatedAt = Date.now();
  sessions.set(session.id, session);
  await touchAiChatSession(session.id, {
    state: serializeBotSessionState(session),
  });
}

export async function flushBotSessionById(
  sessionId: string,
  clientId: string,
): Promise<void> {
  const session = sessions.get(sessionId);
  if (session && session.clientId === clientId) {
    await flushBotSession(session);
  }
}

export async function reloadBotSessionFromStore(
  session: BotSession,
): Promise<void> {
  const persisted = await getAiChatSession(session.id, session.clientId);
  if (persisted) {
    hydrateBotSessionFromState(session, persisted.state);
    sessions.set(session.id, session);
  }
}

export function getBotSessionFromMemory(sessionId: string) {
  return sessions.get(sessionId);
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
