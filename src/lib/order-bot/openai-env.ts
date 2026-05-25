/** Resolve OpenAI key — ignore empty duplicate lines in .env (use last non-empty). */
export function resolveOpenAiApiKey() {
  const candidates = [process.env.OPENAI_API_KEY, process.env.OPENAPI_API_KEY];
  for (let i = candidates.length - 1; i >= 0; i--) {
    const key = candidates[i]?.trim();
    if (key) return key;
  }
  return "";
}

export function resolveOrderBotLlmModel() {
  const raw = process.env.ORDER_BOT_LLM_MODEL?.trim() || "gpt-4o-mini";
  return raw.replace(/\s*#.*$/, "").trim() || "gpt-4o-mini";
}

export function isOrderBotLlmEnabled() {
  if (process.env.ORDER_BOT_LLM_ENABLED === "false") return false;
  return Boolean(resolveOpenAiApiKey());
}
