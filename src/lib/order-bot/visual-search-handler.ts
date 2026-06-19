import type { AiLanguage, AiSource } from "@/lib/ai-chat/types";
import { productsCardsIntro } from "@/lib/ai-chat/welcome";
import {
  normalizeAiLanguage,
  normalizeAiSource,
  persistBotExchange,
  trackBotEvent,
} from "@/lib/ai-chat/session-lifecycle";
import { productsToBotPreviews } from "@/lib/ai-sales/recommendations";
import {
  appendChatHistory,
  getBotSession,
  touchBotSession,
  type BotSession,
} from "@/lib/order-bot/session-store";
import type { BotChatResponse } from "@/lib/order-bot/types";
import type { VisualSearchAnalysis } from "@/lib/visual-search";
import { searchProductsByImage } from "@/lib/visual-search";
import type { AppLocale } from "@/lib/localized-text";

function formatDetectedSummary(
  analysis: VisualSearchAnalysis,
  language: AiLanguage,
): string {
  const parts = [
    analysis.pattern,
    analysis.colors[0],
    analysis.productType ?? analysis.category ?? analysis.garmentType,
  ].filter(Boolean);

  if (language === "hi") {
    const detected = parts.length
      ? parts.join(", ")
      : analysis.keywords.slice(0, 3).join(", ");
    return detected
      ? `Photo se detect hua: **${detected}**.`
      : "Photo analyze kar li hai.";
  }
  if (language === "hinglish") {
    const detected = parts.length
      ? parts.join(", ")
      : analysis.keywords.slice(0, 3).join(", ");
    return detected
      ? `Photo se detect hua: **${detected}**.`
      : "Photo analyze kar li hai.";
  }

  const detected = parts.length
    ? parts.join(", ")
    : analysis.keywords.slice(0, 3).join(", ");
  return detected
    ? `From your photo I detected: **${detected}**.`
    : "I've analyzed your photo.";
}

export function buildVisualSearchReply(
  session: BotSession,
  analysis: VisualSearchAnalysis,
  productCount: number,
): string {
  const intro = formatDetectedSummary(analysis, session.language);
  const cards = productsCardsIntro(session.language, productCount);
  if (!productCount) {
    if (session.language === "hi") {
      return `${intro}\n\nCatalog mein close match nahi mila. Category ya fabric bata kar try karein.`;
    }
    if (session.language === "hinglish") {
      return `${intro}\n\nCatalog mein close match nahi mila. Category ya fabric bata kar try karein.`;
    }
    return `${intro}\n\nI couldn't find close matches in the catalog. Try describing the category or fabric.`;
  }
  return `${intro}\n\n${cards}`;
}

export async function handleOrderBotVisualSearch(input: {
  imageBuffer: Buffer;
  mime: string;
  textQuery?: string;
  sessionId?: string;
  clientId: string;
  clientEmail: string;
  language?: AiLanguage;
  source?: AiSource;
  locale?: AppLocale;
}): Promise<BotChatResponse> {
  const language = normalizeAiLanguage(input.language);
  const source = normalizeAiSource(input.source);
  const session = await getBotSession({
    sessionId: input.sessionId,
    clientId: input.clientId,
    clientEmail: input.clientEmail,
    language,
    source,
  });

  const userLabel = input.textQuery?.trim()
    ? `[Photo search: ${input.textQuery.trim()}]`
    : "[Photo search]";

  const result = await searchProductsByImage({
    imageBuffer: input.imageBuffer,
    mime: input.mime,
    textQuery: input.textQuery,
    clientId: input.clientId,
    limit: 6,
    locale: input.locale ?? "en",
  });

  const products = productsToBotPreviews(result.items, 6);
  session.lastProducts = products;
  session.attachProductCards = products.length > 0;
  touchBotSession(session);

  const reply = buildVisualSearchReply(
    session,
    result.analysis,
    products.length,
  );

  appendChatHistory(session, "user", userLabel);
  appendChatHistory(session, "assistant", reply);

  await persistBotExchange(session, userLabel, reply, {
    products: products.length,
    visualSearch: {
      pattern: result.analysis.pattern,
      colors: result.analysis.colors,
      category: result.analysis.category,
      garmentType: result.analysis.garmentType,
      source: result.analysis.source,
    },
  });

  if (products.length) {
    await trackBotEvent(session, "product_recommended", {
      metadata: {
        count: products.length,
        via: "visual_search",
        pattern: result.analysis.pattern,
        category: result.analysis.category,
        terms: result.terms,
        source: result.analysis.source,
      },
    });
  }

  return {
    sessionId: session.id,
    reply,
    language: session.language,
    sessionPhase: session.lifecyclePhase ?? "active",
    products: products.length ? products : undefined,
    quickReplies: products.length
      ? ["Add first to cart", "Browse more", "Track my orders"]
      : ["Browse Products", "Track my orders"],
    visualSearch: {
      pattern: result.analysis.pattern,
      colors: result.analysis.colors,
      category: result.analysis.category ?? result.analysis.garmentType,
      keywords: result.analysis.keywords,
      source: result.analysis.source,
    },
  };
}
