import type { BotProductPreview } from "@/lib/order-bot/types";

export type AiMemoryEventType =
  | "search"
  | "product_view"
  | "add_to_cart"
  | "order";

export type AiMemoryInterestType = AiMemoryEventType | "category";

export type AiMemoryRecommendationKind =
  | "recommended_products"
  | "continue_shopping"
  | "similar_products"
  | "best_sellers"
  | "frequently_bought_together"
  | "premium_alternatives";

export type AiMemorySource = "web" | "app";

export type AiUserInterestRow = {
  id: string;
  clientId: string;
  interestKey: string;
  interestType: AiMemoryInterestType;
  productSlug?: string;
  category?: string;
  searchQuery?: string;
  quantityTotal: number;
  orderCount: number;
  score: number;
  sources: AiMemorySource[];
  lastSeenAt: string;
  createdAt: string;
};

export type AiUserRecommendationRow = {
  id: string;
  clientId: string;
  kind: AiMemoryRecommendationKind;
  productSlugs: string[];
  context: Record<string, unknown>;
  source: AiMemorySource;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TrackAiMemoryInput = {
  clientId: string;
  eventType: AiMemoryEventType;
  source?: AiMemorySource;
  productSlug?: string;
  category?: string;
  searchQuery?: string;
  quantity?: number;
  budgetInr?: number;
  sessionId?: string;
};

export type MemoryRecommendationBlock = {
  kind: AiMemoryRecommendationKind;
  title: string;
  reason: string;
  products: BotProductPreview[];
};

export type AiMemoryRecommendationsPayload = {
  blocks: MemoryRecommendationBlock[];
  interests: AiUserInterestRow[];
  generatedAt: string;
  cachedRecommendationKinds?: AiMemoryRecommendationKind[];
};

export type AiRevenueDashboard = {
  aiOrders: number;
  aiRevenueInr: number;
  aiConversionRate: number;
  totalSessions: number;
  sessionsWithOrder: number;
  topAiProducts: Array<{
    slug: string;
    name: string;
    orders: number;
    revenueInr: number;
  }>;
  topAiCategories: Array<{
    category: string;
    orders: number;
    revenueInr: number;
  }>;
  leadsByIntent: Record<string, number>;
};

export type CaptureAbandonedIntentInput = {
  clientId: string;
  sessionId?: string;
  source?: AiMemorySource;
  interestedProduct?: string;
  productSlugs?: string[];
  quantity?: number;
  budgetInr?: number;
  notes?: string;
};
