import type {
  BotCartOptimization,
  BotSalesSuggestion,
} from "@/lib/ai-sales/types";

export type BotCartLine = {
  slug: string;
  name: string;
  color: string;
  sizes: string[];
  setQuantity: number;
  imageUrl?: string;
  lineTotal?: number;
};

export type BotProductPreview = {
  index: number;
  slug: string;
  name: string;
  category: string;
  color: string;
  sizes: string[];
  setPrice: number;
  moq?: number;
  inStock: boolean;
  /** Available sets when stock is tracked in catalog */
  setsInStock?: number;
  imageUrl?: string;
};

export type BotCategoryPreview = {
  name: string;
  slug: string;
  count: number;
  kind: "category" | "collection";
  href?: string;
  imageUrl?: string;
};

export type BotOrderItemPreview = {
  slug: string;
  name: string;
  imageUrl?: string;
  color?: string;
  sizes?: string[];
  setQuantity: number;
  lineTotal?: number;
};

export type BotOrderPreview = {
  id: string;
  status: string;
  createdAt: string;
  subtotal: number;
  placedVia?: string;
  items: BotOrderItemPreview[];
};

export type BotNavAction = {
  label: string;
  href: string;
};

export type BotSessionPhase =
  | "active"
  | "closing"
  | "awaiting_rating"
  | "closed";

export type BotChatResponse = {
  sessionId: string;
  reply: string;
  language?: "en" | "hi" | "hinglish";
  sessionPhase?: BotSessionPhase;
  showRating?: boolean;
  categories?: string[];
  categoryPreviews?: BotCategoryPreview[];
  products?: BotProductPreview[];
  cart?: BotCartLine[];
  cartTotal?: number;
  orders?: BotOrderPreview[];
  placedOrder?: BotOrderPreview;
  orderPlaced?: boolean;
  orderId?: string;
  quickReplies?: string[];
  navActions?: BotNavAction[];
  salesSuggestions?: BotSalesSuggestion[];
  cartOptimization?: BotCartOptimization;
  visualSearch?: {
    pattern?: string;
    colors?: string[];
    category?: string;
    keywords?: string[];
    source?: "vision" | "color-fallback";
  };
};
