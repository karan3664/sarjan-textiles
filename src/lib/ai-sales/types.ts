import type { BotProductPreview } from "@/lib/order-bot/types";

export type AiLeadStatus = "new" | "qualified" | "converted" | "lost";

export type AiLeadRow = {
  id: string;
  clientId: string;
  sessionId?: string;
  status: AiLeadStatus;
  intentType?: "purchase_intent" | "abandoned_cart" | "general";
  productInterest?: string;
  interestedProduct?: string;
  productSlugs: string[];
  quantityInterest?: number;
  budgetInr?: number;
  source: "web" | "app";
  notes?: string;
  convertedOrderId?: string;
  revenueInr?: number;
  createdAt: string;
  updatedAt: string;
};

export type SalesRecommendationKind =
  | "similar"
  | "bought_together"
  | "budget"
  | "quantity"
  | "upsell"
  | "cross_sell"
  | "best_sellers"
  | "premium_alternatives";

export type BotSalesSuggestion = {
  kind: SalesRecommendationKind;
  title: string;
  reason: string;
  products: BotProductPreview[];
};

export type BotCartOptimization = {
  totalPieces: number;
  currentShippingInr: number;
  piecesToAdd: number;
  targetPieces: number;
  shippingAfterInr: number;
  shippingSavingsInr: number;
  message: string;
};

export type AiSalesAnalyticsSummary = {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  aiRevenueInr: number;
  aiOrderCount: number;
  averageLeadBudgetInr: number | null;
  recentLeads: AiLeadRow[];
  leadsByStatus: Record<AiLeadStatus, number>;
};

export type CaptureAiLeadInput = {
  clientId: string;
  sessionId?: string;
  source?: "web" | "app";
  intentType?: "purchase_intent" | "abandoned_cart" | "general";
  productInterest?: string;
  interestedProduct?: string;
  productSlugs?: string[];
  quantityInterest?: number;
  budgetInr?: number;
  notes?: string;
  status?: AiLeadStatus;
};
