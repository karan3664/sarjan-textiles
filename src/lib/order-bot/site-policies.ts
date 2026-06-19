import { FULL_SIZE_RUN } from "@/lib/cart-client";
import { COLLECTION_ROUTES } from "@/lib/product-seo-slug";
import { siteSettings } from "@/data/site";

export type WebsiteInfoTopic =
  | "contact"
  | "credit"
  | "payment"
  | "moq"
  | "register"
  | "tracking"
  | "pages"
  | "general"
  | "shipping"
  | "terms"
  | "process"
  | "collections"
  | "faq"
  | "refund";

const sizeRunLabel = FULL_SIZE_RUN.join(" / ");

export function buildWebsiteInfoReply(topic: WebsiteInfoTopic): string {
  const s = siteSettings;

  switch (topic) {
    case "contact":
      return [
        `**${s.brandName}**`,
        `Phone: ${s.phone}`,
        `Email: ${s.email}`,
        `Address: ${s.address}`,
        `Hours: ${s.openTimeWeekday}; ${s.openTimeSunday}`,
        `More: **/contact**`,
      ].join("\n");

    case "credit":
    case "payment":
      return [
        `**Payment & credit (B2B)**`,
        `• Approved clients: **${s.creditTermDays}-day credit** on cheque workflow (as on your account).`,
        "• Payment terms are **confirmed by Sarjan accounts team after order approval** — not at checkout.",
        "• Checkout submits an **order request**; admin reviews stock, MOQ, and dispatch before approval.",
        "• Payment / deposit status for each order: **/account** → Your Orders.",
        "• Full workflow: **/process** · FAQs: **/faqs** · Terms: **/terms**",
      ].join("\n");

    case "moq":
      return [
        "**MOQ & set buying**",
        "• Each product line has a **MOQ** (minimum sets) — shown on the product page and in catalog.",
        `• Standard full size set per line: **${sizeRunLabel}**.`,
        "• Single-piece retail ordering is **not** supported — set-wise B2B only.",
        "• Admin confirms stock and final quantity on approval.",
      ].join("\n");

    case "register":
      return [
        "**New wholesale account**",
        "• Register at **/register** with GST verification.",
        "• Admin approves your profile before you can place orders.",
        "• After approval, order here in Sarjan AI or on the storefront.",
      ].join("\n");

    case "tracking":
      return [
        "**Order tracking**",
        "• **/order-tracking** — lookup by order ID (e.g. ST-…).",
        "• **/account** → Your Orders — full timeline, LR/transport, dispatch stages.",
        "• Stages include: Pending approval → Approved → production/packing → Dispatched → Delivered.",
        "• Ask me **track order ST-xxxx** for your orders in this chat.",
      ].join("\n");

    case "shipping":
      return [
        "**Shipping & dispatch**",
        "• B2B consignments across India; freight and transport confirmed **after order approval**.",
        "• Dispatch depends on MOQ, production slots, and packing — your account manager shares committed dates.",
        "• E-way / transporter details appear with dispatch updates when applicable.",
        "• Risk transfer follows your tax invoice / Incoterm once goods are handed to the carrier.",
        "• Full policy: **/shipping-policy**",
      ].join("\n");

    case "terms":
      return [
        "**Terms of use (summary)**",
        "• Only **approved wholesale clients** can place orders.",
        `• **MOQ & sets:** full size run ordering (${sizeRunLabel}).`,
        "• Every order stays **pending until Sarjan admin** confirms stock, MOQ, dispatch terms, and quantity.",
        "• **Payment:** terms confirmed by accounts team after approval.",
        "• **Dispatch stages:** Pending → Approved → In Production → Packed → Ready for Dispatch → Dispatched → Delivered.",
        "• Full page: **/terms**",
      ].join("\n");

    case "process":
      return [
        "**B2B process (4 steps)**",
        "1. **Client approval** — register at /register; admin verifies and approves account.",
        "2. **Order approval** — you submit order request; admin approves, rejects, or adjusts qty.",
        "3. **Dispatch tracking** — production, packing, LR/courier/vehicle, dispatch & delivery history.",
        "4. **Accounts** — payment terms confirmed after order approval.",
        "• Details: **/process**",
      ].join("\n");

    case "collections":
      return [
        "**Curated collections** on the site:",
        ...COLLECTION_ROUTES.map(
          (c) =>
            `• **${c.title}** — ${c.description} → **/collections/${c.slug}**`,
        ),
        "• All collections hub: **/collections**",
        "• Browse products: **/products** · Categories: **/categories**",
        "• Say **show Ajrakh** or **categories** here to shop in chat.",
      ].join("\n");

    case "faq":
      return [
        "**FAQs (from sarjantextiles.com/faqs)**",
        "• **Single pieces?** No — set-wise ordering by size run and color.",
        "• **How payment works?** Terms confirmed by accounts team after order approval.",
        "• **Who approves orders?** Admin reviews stock, MOQ, production, and dispatch.",
        "• **ERP later?** Order data structured for Tally/AWS migration.",
        "• More: **/faqs**",
      ].join("\n");

    case "refund":
      return [
        "**Refund & cancellation (summary)**",
        "• Checkout = **order request** until admin approval — no binding dispatch before that.",
        "• Quality claims: within the window on your invoice; returns follow LR/transport proof.",
        "• Refunds / credit notes per your ledger and payment mode on file.",
        "• Full policy: **/refund-policy**",
      ].join("\n");

    case "pages":
      return [
        "**Key pages:**",
        "• /products — catalog",
        "• /categories — category hubs",
        "• /collections — curated collections",
        "• /process — B2B workflow",
        "• /faqs — frequently asked questions",
        "• /terms — terms of use",
        "• /shipping-policy — shipping & dispatch",
        "• /refund-policy — refunds & cancellations",
        "• /account — orders & profile",
        "• /order-tracking — track by order ID",
        "• /contact — contact us",
      ].join("\n");

    default:
      return [
        s.seo.description,
        "",
        "I help with **catalog, cart, orders, tracking**, and **website policies** (payment, shipping, terms, process, collections, FAQs).",
        "Ask e.g. *payment terms*, *shipping*, *how to order*, or *collections*.",
      ].join("\n");
  }
}

/** Rule-based / keyword routing when LLM is off or before catalog Q&A. */
export function detectWebsitePolicyTopic(
  text: string,
): WebsiteInfoTopic | null {
  const lower = text.toLowerCase().trim();
  if (!lower || lower.length < 3) return null;

  if (
    (/\b(how|what|kya|kaise)\b/i.test(lower) &&
      /\b(shipping|dispatch)\b/i.test(lower)) ||
    /(shipping policy|shipping|dispatch policy|freight|e-?way|delivery policy|ship kaise|dispatch kaise)/i.test(
      lower,
    )
  ) {
    if (!/track\s+(my\s+)?order/i.test(lower)) return "shipping";
  }

  if (
    /(terms|term of use|terms and conditions|t&c|conditions of sale|wholesale rules)/i.test(
      lower,
    )
  ) {
    return "terms";
  }

  if (
    /(refund|return policy|cancellation|cancel order|credit note)/i.test(lower)
  ) {
    return "refund";
  }

  if (
    /(^|\s)(faq|faqs)\b|frequently asked|who approves|single piece|erp sync|erp later/i.test(
      lower,
    )
  ) {
    return "faq";
  }

  if (
    /(payment condition|payment terms|payment process|how payment|how does payment|payment work|how (?:do i|to) pay|payment kaise|cheque|credit term|credit days|deposit status|accounts team|\bpayment\b.*\?)/i.test(
      lower,
    ) ||
    (/\b(how|what|kya|kaise)\b/i.test(lower) && /\bpayment\b/i.test(lower))
  ) {
    return "payment";
  }

  if (
    /(collection|collections|ajrakh|mashru|block print)/i.test(lower) &&
    !/(add|cart|order|price|moq|stock)/i.test(lower)
  ) {
    return "collections";
  }

  if (
    /(order process|ordering process|b2b process|workflow|kaise order|process kya|registration process|approval process)/i.test(
      lower,
    ) &&
    !/payment/i.test(lower)
  ) {
    return "process";
  }

  if (
    /(contact|phone|email|address|location|ghar|call|reach you|office)/i.test(
      lower,
    ) &&
    !/order/i.test(lower)
  ) {
    return "contact";
  }

  if (/(register|sign up|signup|account ban)/i.test(lower)) {
    return "register";
  }

  if (
    /(track order|order status|lr number|where is my order|mera order)/i.test(
      lower,
    )
  ) {
    return "tracking";
  }

  if (/(moq|minimum order|min qty|set wise|size run)/i.test(lower)) {
    return "moq";
  }

  if (/(credit|\d+\s*days?|\d+-day)/i.test(lower) && !/card/i.test(lower)) {
    return "credit";
  }

  return null;
}

export function answerWebsitePolicyQuestion(text: string): string | null {
  const topic = detectWebsitePolicyTopic(text);
  if (!topic) return null;
  return buildWebsiteInfoReply(topic);
}
