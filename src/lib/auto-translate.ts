import {
  resolveOpenAiApiKey,
  resolveOrderBotLlmModel,
} from "@/lib/order-bot/openai-env";

const CHUNK_SIZE = 40;
const MYMEMORY_CHUNK_SIZE = 8;
const MYMEMORY_DELAY_MS = 400;
const MYMEMORY_LANG = { hi: "hi", gu: "gu" } as const;

type TranslationMap = Record<string, { hi: string; gu: string }>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateChunkOpenAi(
  items: Record<string, string>,
): Promise<TranslationMap> {
  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OpenAI not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolveOrderBotLlmModel(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Translate Sarjan Textiles wholesale apparel app copy from English to Hindi (hi) and Gujarati (gu).
Return JSON only: { "key": { "hi": "...", "gu": "..." }, ... }
Rules:
- Natural B2B retail tone for India
- Keep "Sarjan Textiles", SKUs, numbers, MOQ values, URLs, emails, phone numbers, @handles unchanged
- Preserve punctuation style where sensible
- No extra keys or commentary`,
        },
        {
          role: "user",
          content: JSON.stringify(items),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `OpenAI translation failed (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ""}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = payload.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("OpenAI translation response empty");
  }

  const parsed = JSON.parse(raw) as TranslationMap;
  const out: TranslationMap = {};
  for (const [key, value] of Object.entries(items)) {
    const translated = parsed[key];
    out[key] = {
      hi: String(translated?.hi ?? value).trim() || value,
      gu: String(translated?.gu ?? value).trim() || value,
    };
  }
  return out;
}

async function translateWithMyMemory(
  text: string,
  target: keyof typeof MYMEMORY_LANG,
  attempt = 0,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const lang = MYMEMORY_LANG[target];
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", trimmed.slice(0, 450));
  url.searchParams.set("langpair", `en|${lang}`);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (response.status === 429 && attempt < 5) {
    await sleep(1200 * (attempt + 1));
    return translateWithMyMemory(text, target, attempt + 1);
  }

  if (!response.ok) {
    return trimmed;
  }

  const payload = (await response.json()) as {
    responseData?: { translatedText?: string };
  };
  const translated = payload.responseData?.translatedText?.trim();
  if (!translated || translated.toUpperCase() === trimmed.toUpperCase()) {
    return trimmed;
  }
  return translated;
}

async function translateChunkMyMemory(
  items: Record<string, string>,
): Promise<TranslationMap> {
  const out: TranslationMap = {};
  for (const [key, value] of Object.entries(items)) {
    const hi = await translateWithMyMemory(value, "hi");
    await sleep(MYMEMORY_DELAY_MS);
    const gu = await translateWithMyMemory(value, "gu");
    await sleep(MYMEMORY_DELAY_MS);
    out[key] = { hi, gu };
  }
  return out;
}

async function translateChunk(
  items: Record<string, string>,
): Promise<TranslationMap> {
  try {
    return await translateChunkOpenAi(items);
  } catch {
    return translateChunkMyMemory(items);
  }
}

/** Batch-translate English strings to Hindi and Gujarati. */
export async function translateEnglishBatch(
  items: Record<string, string>,
): Promise<TranslationMap> {
  const entries = Object.entries(items).filter(([, value]) => value.trim());
  if (!entries.length) return {};

  const useOpenAi = Boolean(resolveOpenAiApiKey());
  const chunkSize = useOpenAi ? CHUNK_SIZE : MYMEMORY_CHUNK_SIZE;
  const merged: TranslationMap = {};

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = Object.fromEntries(entries.slice(i, i + chunkSize));
    try {
      const translated = useOpenAi
        ? await translateChunkOpenAi(chunk)
        : await translateChunkMyMemory(chunk);
      Object.assign(merged, translated);
    } catch {
      const fallback = await translateChunkMyMemory(chunk).catch(() => {
        const englishOnly: TranslationMap = {};
        for (const [key, value] of Object.entries(chunk)) {
          englishOnly[key] = { hi: value, gu: value };
        }
        return englishOnly;
      });
      Object.assign(merged, fallback);
    }
  }
  return merged;
}

export function isAutoTranslateConfigured() {
  return Boolean(resolveOpenAiApiKey());
}

export type TranslateProvider = "openai" | "mymemory" | "none";

export async function translateEnglishBatchWithMeta(
  items: Record<string, string>,
): Promise<{ translations: TranslationMap; provider: TranslateProvider }> {
  const entries = Object.entries(items).filter(([, value]) => value.trim());
  if (!entries.length) {
    return { translations: {}, provider: "none" };
  }

  const merged: TranslationMap = {};
  let provider: TranslateProvider = resolveOpenAiApiKey()
    ? "openai"
    : "mymemory";

  const chunkSize = provider === "openai" ? CHUNK_SIZE : MYMEMORY_CHUNK_SIZE;

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = Object.fromEntries(entries.slice(i, i + chunkSize));
    try {
      if (resolveOpenAiApiKey()) {
        Object.assign(merged, await translateChunkOpenAi(chunk));
        continue;
      }
      provider = "mymemory";
      Object.assign(merged, await translateChunkMyMemory(chunk));
    } catch {
      provider = "mymemory";
      Object.assign(
        merged,
        await translateChunkMyMemory(chunk).catch(() => {
          const englishOnly: TranslationMap = {};
          for (const [key, value] of Object.entries(chunk)) {
            englishOnly[key] = { hi: value, gu: value };
          }
          return englishOnly;
        }),
      );
    }
  }

  return { translations: merged, provider };
}
