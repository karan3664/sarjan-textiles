export type AiLanguage = "en" | "hi" | "hinglish";
export type AiSource = "web" | "app";
export type AiSessionStatus = "active" | "closing" | "closed";
export type AiMessageRole = "user" | "assistant" | "system";

export type AiSessionEventType =
  | "session_started"
  | "session_closed"
  | "session_rated"
  | "product_viewed"
  | "product_recommended"
  | "add_to_cart"
  | "order_placed"
  | "language_selected"
  | "quick_action"
  | "upsell_shown"
  | "lead_captured"
  | "recommendation_accepted";

export type AiChatSessionRow = {
  id: string;
  clientId: string;
  language: AiLanguage;
  source: AiSource;
  status: AiSessionStatus;
  state: Record<string, unknown>;
  startedAt: string;
  endedAt?: string;
  lastActivityAt: string;
  sessionDurationSeconds?: number;
  rating?: number;
  feedback?: string;
  productsViewed: number;
  productsRecommended: number;
  addToCartCount: number;
  ordersPlaced: number;
};

export type AiChatMessageRow = {
  id: string;
  sessionId: string;
  role: AiMessageRole;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AiUserPreferences = {
  clientId: string;
  language: AiLanguage;
  updatedAt: string;
};

export type AiAnalyticsSummary = {
  totalSessions: number;
  activeSessions: number;
  closedSessions: number;
  averageRating: number | null;
  ratedSessions: number;
  productsViewed: number;
  productsRecommended: number;
  addToCartEvents: number;
  ordersPlaced: number;
  sessionsBySource: { web: number; app: number };
  sessionsByLanguage: Record<AiLanguage, number>;
  recentSessions: AiChatSessionRow[];
};

export const AI_LANGUAGES: Array<{ id: AiLanguage; label: string }> = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "hinglish", label: "Hinglish" },
];

export const AI_INACTIVITY_MS = 5 * 60 * 1000;
export const AI_PRODUCT_QUANTITY_PRESETS = [25, 50, 100] as const;
