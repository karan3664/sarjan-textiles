import { answerWebsitePolicyQuestion } from "@/lib/order-bot/site-policies";
import type { BotSession } from "@/lib/order-bot/session-store";
import type { BotProductPreview } from "@/lib/order-bot/types";

const VULGAR_PATTERN =
  /\b(fuck|shit|bitch|asshole|bastard|damn\s*you|chutiya|chutiy|madarchod|bhenchod|bc\b|mc\b|gaand|gandu|lodu|lund|randi)\b/i;

const AFFIRMATIVE =
  /^(yes|yeah|yep|yup|ok|okay|sure|correct|right|haan|ha|ji|theek|thik|bilkul|confirm|done|go ahead|please do|add it|le lo|lelo|order it|yes please|haan ji|theek hai)\.?$/i;

const NEGATIVE =
  /^(no|nope|nah|cancel|stop|nahi|mat|don't|dont|skip|not this|wrong)\.?$/i;

export function isVulgarMessage(text: string) {
  return VULGAR_PATTERN.test(text.trim());
}

export function vulgarRefusal() {
  return "Please keep messages professional — I'm here to help with Sarjan B2B orders, catalog, and cart. Ask about products, categories, or say **help** for commands.";
}

export function isAffirmative(text: string) {
  return AFFIRMATIVE.test(text.trim());
}

export function isNegative(text: string) {
  return NEGATIVE.test(text.trim());
}

/** User wants order status / tracking (rules + LLM fallback). */
export function isOrderTrackingIntent(text: string) {
  const lower = text.trim().toLowerCase();
  if (/\bST-\d+\b/i.test(text)) return true;
  return (
    /^my orders?$/i.test(lower) ||
    /^order history$/i.test(lower) ||
    /^track(?:ing)?$/i.test(lower) ||
    /^track\s+order$/i.test(lower) ||
    /track\s+(?:my\s+)?orders?/i.test(lower) ||
    /(?:my|mera)\s+orders?/i.test(lower) ||
    /order\s+track/i.test(lower) ||
    /order\s+status/i.test(lower) ||
    /dispatch\s+status/i.test(lower) ||
    /kahan\s+hai\s+mera\s+order/i.test(lower) ||
    /order\s+kahan/i.test(lower)
  );
}

/** User wants to submit the current cart as an order (chip, rules, before LLM). */
export function isPlaceOrderIntent(text: string) {
  const lower = text.trim().toLowerCase();
  return (
    /^place order$|^submit order$|^confirm order$/i.test(lower) ||
    /^order place$/i.test(lower) ||
    /^place my order$/i.test(lower)
  );
}

/** User wants to view the cart (before LLM). */
export function isViewCartIntent(text: string) {
  const lower = text.trim().toLowerCase();
  return /^cart$|^my cart$|^show cart$|^view cart$/i.test(lower);
}

/** e.g. "1 23", "1 23 yes", "#2 50 sets" — product # then set count */
export function parseProductIndexAndSets(
  text: string,
  max: number,
): { index: number; sets: number } | null {
  const trimmed = text.trim();
  const match = trimmed.match(
    /^#?(\d+)\s+(\d+)\s*(?:sets?|set)?(?:\s*(?:yes|haan|ok|ji|theek|confirm))?\.?$/i,
  );
  if (!match) return null;
  const index = Number(match[1]);
  const sets = Number(match[2]);
  if (
    !Number.isInteger(index) ||
    !Number.isInteger(sets) ||
    index < 1 ||
    index > max ||
    sets < 1
  ) {
    return null;
  }
  return { index, sets };
}

/** Update cart line: "update cart 1 23", "change 1 to 23 sets" */
export function parseCartQuantityUpdate(text: string, cartLines: number) {
  if (cartLines < 1) return null;
  const trimmed = text.trim();
  const patterns = [
    /^(?:update|change|set)\s+(?:cart\s+)?#?(\d+)\s+(?:to\s+)?(\d+)\s*(?:sets?|set)?$/i,
    /^cart\s+#?(\d+)\s+(\d+)\s*(?:sets?|set)?$/i,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const lineIndex = Number(match[1]);
    const sets = Number(match[2]);
    if (
      Number.isInteger(lineIndex) &&
      Number.isInteger(sets) &&
      lineIndex >= 1 &&
      lineIndex <= cartLines &&
      sets >= 1
    ) {
      return { lineIndex, sets };
    }
  }
  return null;
}

export function parseProductPickIndex(
  text: string,
  max: number,
): number | null {
  const trimmed = text.trim();
  const num = trimmed.match(/^#?(\d+)$/);
  if (num) {
    const index = Number(num[1]);
    if (index >= 1 && index <= max) return index;
  }
  if (/^(first|pehla|pehle|one|ek)$/i.test(trimmed) && max >= 1) return 1;
  if (/^(second|doosra|dusra|two|do)$/i.test(trimmed) && max >= 2) return 2;
  if (/^(third|teesra|teen)$/i.test(trimmed) && max >= 3) return 3;
  return null;
}

export function markProductPickPending(session: BotSession) {
  if (session.lastProducts.length) session.pendingProductPick = true;
}

export function clearProductPickPending(session: BotSession) {
  session.pendingProductPick = false;
}

export function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatProductDetail(product: BotProductPreview) {
  return [
    `**${product.name}** (${product.category})`,
    `${money(product.setPrice)}/set · MOQ ${product.moq ?? 1} · ${product.inStock ? "In stock" : "Out of stock"}`,
    "",
    `To order: **${product.index} 50** or **add ${product.index} 50 sets** (product #, then sets).`,
  ].join("\n");
}

export function pickProductFromSession(
  session: BotSession,
  index: number,
): BotProductPreview | null {
  const product = session.lastProducts[index - 1];
  if (!product) return null;
  session.focusProductIndex = index;
  clearProductPickPending(session);
  return product;
}

export function tryParseLooseSetQuantity(text: string) {
  const match = text.trim().match(/^(?:add\s+)?(\d+)\s*(?:sets?|set)?$/i);
  if (!match) return null;
  const qty = Math.max(1, Number(match[1]) || 1);
  return Number.isFinite(qty) ? qty : null;
}

type QuestionKind =
  | "price"
  | "moq"
  | "stock"
  | "thanks"
  | "how_order"
  | "capabilities"
  | null;

function detectQuestion(text: string): QuestionKind {
  const lower = text.toLowerCase();
  if (/^(thanks|thank you|dhanyavad|shukriya|thx)\b/i.test(lower))
    return "thanks";
  if (
    /(how (?:do i|to) order|order kaise|place order kaise|how to buy)/i.test(
      lower,
    )
  )
    return "how_order";
  if (
    /(what can you|kya kar sakte|help me|commands|kya kya)/i.test(lower) &&
    !/product|kurta|shirt|ajrakh/i.test(lower)
  )
    return "capabilities";
  if (/(price|cost|rate|kitna|pricing|mrp)/i.test(lower)) return "price";
  if (/(moq|minimum order|min qty|minimum qty)/i.test(lower)) return "moq";
  if (/(stock|available|in stock|out of stock)/i.test(lower)) return "stock";
  return null;
}

export function answerCatalogQuestion(
  session: BotSession,
  text: string,
): string | null {
  const kind = detectQuestion(text);
  if (!kind) return null;

  const products = session.lastProducts;
  const focus =
    session.focusProductIndex != null
      ? products[session.focusProductIndex - 1]
      : products[0];

  switch (kind) {
    case "thanks":
      return "You're welcome. Need anything else — more sets, another category, or **place order**?";
    case "how_order":
      return [
        "Quick flow:",
        "1. **categories** or **show Kurtas** — see products",
        "2. Pick one (**yes**, a number, or product name)",
        "3. **add 1 50 sets** — product # from the list + sets",
        "4. **cart** → **place order**",
      ].join("\n");
    case "capabilities":
      return [
        "I help with Sarjan B2B:",
        "• **Products** — categories, collections, search, MOQ, stock, cart, place order",
        "• **Your orders** — track status, dispatch, payment on account",
        "• **Website** — payment terms, shipping, process, terms, FAQs, contact, collections",
        "Ask e.g. *payment condition*, *shipping policy*, or **show Kurtas**.",
      ].join("\n");
    case "price":
      if (focus)
        return `${focus.name}: **${money(focus.setPrice)}/set** (${focus.category}).`;
      if (products.length)
        return `Latest list:\n${products.map((p) => `• ${p.name} — ${money(p.setPrice)}/set`).join("\n")}`;
      return "Tell me a product or category first — e.g. **show Kurtas** or type a product name.";
    case "moq":
      if (focus)
        return `${focus.name}: MOQ **${focus.moq ?? 1}** set(s) per line.`;
      if (products.length)
        return products
          .map((p) => `• ${p.name} — MOQ ${p.moq ?? 1}`)
          .join("\n");
      return "Browse products first; each line shows MOQ. Try **categories** or a product name.";
    case "stock":
      if (focus)
        return `${focus.name} is ${focus.inStock ? "**in stock**" : "**out of stock**"} right now.`;
      if (products.length)
        return products
          .map(
            (p) => `• ${p.name} — ${p.inStock ? "in stock" : "out of stock"}`,
          )
          .join("\n");
      return "Search or browse first — e.g. **show Ajrakh** — then I can check stock.";
    default:
      return null;
  }
}

export function contextualFallback(session: BotSession, text: string) {
  const policy = answerWebsitePolicyQuestion(text);
  if (policy) return policy;

  const qa = answerCatalogQuestion(session, text);
  if (qa) return qa;

  if (session.pendingProductPick && session.lastProducts.length) {
    const list = session.lastProducts
      .slice(0, 5)
      .map((p) => `${p.index}. ${p.name}`)
      .join("\n");
    return `Pick a product from the list:\n${list}\n\nReply **yes** or **1** for the first, another number, or **add 2 50 sets**.`;
  }

  if (session.lastProducts.length) {
    const names = session.lastProducts
      .slice(0, 3)
      .map((p) => `**${p.name}** (#${p.index})`)
      .join(", ");
    return `For ${names}: reply **1 50** (product # + sets), **yes**, or **add 1 50 sets**. Low stock? Use the max sets shown — e.g. **1 23**. Say **cart** to change quantities.`;
  }

  if (session.lastCategory) {
    return `Still on **${session.lastCategory}**. Say **categories**, a product name, or **add 1 50 sets** after you pick from the list.`;
  }

  if (session.cart.length) {
    return `You have ${session.cart.length} line(s) in cart. Say **cart**, **place order**, or browse with **categories** / a product name.`;
  }

  return [
    "I can help with Sarjan wholesale orders — try a product name, **categories**, **show Kurtas**, or **search blue cotton**.",
    "After you see a list, reply **yes**, a number, or **add 2 50 sets**.",
    "Say **help** for all commands.",
  ].join("\n");
}
