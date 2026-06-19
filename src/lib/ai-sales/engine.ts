import { analyzeCartShipping } from "@/lib/ai-sales/cart-optimization";
import { captureAiLead, markAiLeadConverted } from "@/lib/ai-sales/leads";
import { recommendProductsForSession } from "@/lib/ai-sales/recommendations";
import type {
  BotCartOptimization,
  BotSalesSuggestion,
  CaptureAiLeadInput,
  SalesRecommendationKind,
} from "@/lib/ai-sales/types";
import { recordAiSessionEvent } from "@/lib/ai-chat/store";
import type { BotCartLine } from "@/lib/order-bot/types";
import type { BotSession } from "@/lib/order-bot/session-store";

export async function runCartOptimization(session: BotSession) {
  const optimization = analyzeCartShipping(session.cart);
  if (!optimization) return null;

  await recordAiSessionEvent({
    sessionId: session.id,
    clientId: session.clientId,
    eventType: "upsell_shown",
    metadata: {
      type: "cart_optimization",
      piecesToAdd: optimization.piecesToAdd,
      shippingSavingsInr: optimization.shippingSavingsInr,
    },
  });

  return optimization;
}

export async function runSalesRecommendations(
  session: BotSession,
  input: {
    kind: SalesRecommendationKind;
    refSlug?: string;
    budgetInr?: number;
    targetSets?: number;
  },
) {
  if (input.budgetInr) session.salesBudgetInr = input.budgetInr;
  if (input.targetSets) session.salesTargetSets = input.targetSets;

  const result = await recommendProductsForSession({
    clientId: session.clientId,
    refSlug:
      input.refSlug ||
      session.lastProducts[0]?.slug ||
      session.cart[session.cart.length - 1]?.slug,
    cartSlugs: session.cart.map((line) => line.slug),
    kind: input.kind,
    budgetInr: input.budgetInr ?? session.salesBudgetInr,
    targetSets: input.targetSets ?? session.salesTargetSets,
  });

  if (result.products.length) {
    session.lastProducts = result.products;
    session.attachProductCards = true;
    session.attachSalesSuggestions = result.suggestions;
  }

  await recordAiSessionEvent({
    sessionId: session.id,
    clientId: session.clientId,
    eventType: "product_recommended",
    metadata: {
      kind: input.kind,
      count: result.products.length,
      budgetInr: input.budgetInr,
      targetSets: input.targetSets,
    },
  });

  return result;
}

export async function captureSalesLead(
  session: BotSession,
  input: Omit<CaptureAiLeadInput, "clientId" | "sessionId">,
) {
  const lead = await captureAiLead({
    clientId: session.clientId,
    sessionId: session.id,
    source: session.source,
    productSlugs:
      input.productSlugs ??
      session.lastProducts.map((product) => product.slug).slice(0, 5),
    productInterest:
      input.productInterest ??
      session.lastProducts[0]?.name ??
      session.lastCategory,
    quantityInterest: input.quantityInterest ?? session.salesTargetSets,
    budgetInr: input.budgetInr ?? session.salesBudgetInr,
    notes: input.notes,
    status: input.status,
  });

  session.lastLeadId = lead.id;

  await recordAiSessionEvent({
    sessionId: session.id,
    clientId: session.clientId,
    eventType: "lead_captured",
    metadata: {
      leadId: lead.id,
      productInterest: lead.productInterest,
      budgetInr: lead.budgetInr,
      quantityInterest: lead.quantityInterest,
    },
  });

  return lead;
}

export async function convertSalesLeadFromOrder(
  session: BotSession,
  orderId: string,
  revenueInr: number,
) {
  await markAiLeadConverted({
    leadId: session.lastLeadId,
    sessionId: session.id,
    clientId: session.clientId,
    orderId,
    revenueInr,
  });
}

export function mergeSalesIntoResponse(
  session: BotSession,
  base: {
    cartOptimization?: BotCartOptimization | null;
    salesSuggestions?: BotSalesSuggestion[];
  },
) {
  return {
    salesSuggestions:
      base.salesSuggestions ?? session.attachSalesSuggestions ?? undefined,
    cartOptimization: base.cartOptimization ?? session.attachCartOptimization,
  };
}

export async function enrichCartResponse(
  session: BotSession,
  cart: BotCartLine[],
) {
  const optimization = await runCartOptimization({ ...session, cart });
  if (optimization) {
    session.attachCartOptimization = optimization;
  }
  return optimization;
}
