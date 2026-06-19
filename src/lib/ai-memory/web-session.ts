const WEB_AI_SESSION_KEY = "sarjan.ai.sessionId";

export function readWebAiSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(WEB_AI_SESSION_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeWebAiSessionId(sessionId: string) {
  if (typeof window === "undefined" || !sessionId.trim()) return;
  try {
    localStorage.setItem(WEB_AI_SESSION_KEY, sessionId.trim());
  } catch {
    /* ignore quota errors */
  }
}

export function clearWebAiSessionId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WEB_AI_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
