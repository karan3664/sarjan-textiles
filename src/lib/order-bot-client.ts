import type { AiLanguage, AiSource } from "@/lib/ai-chat/types";
import type { AiPageContext } from "@/lib/ai-chat/page-context";
import type { BotChatResponse } from "@/lib/order-bot/types";
import {
  clientAuthHeaders,
  clientAuthJsonHeaders,
} from "@/lib/client-auth-browser";

export async function fetchOrderBotPreferences() {
  const res = await fetch("/api/client/order-bot/preferences", {
    headers: clientAuthJsonHeaders(),
    credentials: "include",
  });
  if (!res.ok) return { language: "en" as AiLanguage };
  return (await res.json()) as {
    language: AiLanguage;
    hasPreference?: boolean;
  };
}

export async function saveOrderBotLanguage(language: AiLanguage) {
  const res = await fetch("/api/client/order-bot/preferences", {
    method: "PATCH",
    headers: clientAuthJsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ language }),
  });
  if (!res.ok) throw new Error("Could not save language preference");
  return res.json();
}

export async function startOrderBotSession(input: {
  language: AiLanguage;
  source?: AiSource;
  resumeSessionId?: string;
}) {
  const res = await fetch("/api/client/order-bot/session", {
    method: "POST",
    headers: clientAuthJsonHeaders(),
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not start session");
  }
  return res.json() as Promise<{
    sessionId: string;
    language: AiLanguage;
    welcome?: string;
    quickActions?: string[];
    clientName?: string;
  }>;
}

export async function closeOrderBotSession(input: {
  sessionId: string;
  rating?: number;
  feedback?: string;
  action?: "close" | "rate";
}) {
  const res = await fetch("/api/client/order-bot/session", {
    method: "PATCH",
    headers: clientAuthJsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ ...input, action: input.action ?? "close" }),
  });
  if (!res.ok) throw new Error("Could not close session");
  return res.json();
}

export async function postOrderBotAction(input: {
  sessionId: string;
  action: "add_to_cart" | "view_product";
  productIndex: number;
  productSlug?: string;
  sets?: number;
  language?: AiLanguage;
  source?: AiSource;
  pageContext?: AiPageContext;
}) {
  const res = await fetch("/api/client/order-bot/action", {
    method: "POST",
    headers: clientAuthJsonHeaders(),
    credentials: "include",
    body: JSON.stringify(input),
  });
  const text = await res.text();
  const data = text
    ? (JSON.parse(text) as BotChatResponse & { error?: string })
    : {};
  return { res, data };
}

export async function postOrderBotChat(input: {
  message: string;
  sessionId: string;
  language?: AiLanguage;
  source?: AiSource;
  pageContext?: AiPageContext;
}) {
  const res = await fetch("/api/client/order-bot/chat", {
    method: "POST",
    headers: clientAuthJsonHeaders(),
    credentials: "include",
    body: JSON.stringify(input),
  });
  const text = await res.text();
  const data = text
    ? (JSON.parse(text) as BotChatResponse & { error?: string })
    : ({} as BotChatResponse & { error?: string });
  return { res, data };
}

export async function postOrderBotVisualSearch(input: {
  file: File;
  sessionId: string;
  language?: AiLanguage;
  source?: AiSource;
  textQuery?: string;
}) {
  const form = new FormData();
  form.append("file", input.file);
  form.append("sessionId", input.sessionId);
  if (input.language) form.append("language", input.language);
  if (input.source) form.append("source", input.source);
  if (input.textQuery?.trim()) form.append("q", input.textQuery.trim());

  const res = await fetch("/api/client/order-bot/visual-search", {
    method: "POST",
    headers: clientAuthHeaders(),
    credentials: "include",
    body: form,
  });
  const text = await res.text();
  let data = {} as BotChatResponse & { error?: string };
  if (text) {
    try {
      data = JSON.parse(text) as BotChatResponse & { error?: string };
    } catch {
      data = {
        sessionId: input.sessionId,
        reply: "",
        error: "Invalid response from visual search",
      };
    }
  }
  return { res, data };
}
