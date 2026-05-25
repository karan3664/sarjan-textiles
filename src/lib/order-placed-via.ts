export type OrderPlacedVia = "storefront" | "ai_bot";

export function normalizeOrderPlacedVia(value: unknown): OrderPlacedVia {
  return value === "ai_bot" ? "ai_bot" : "storefront";
}

export function orderPlacedViaLabel(
  placedVia?: OrderPlacedVia | string | null,
) {
  return normalizeOrderPlacedVia(placedVia) === "ai_bot"
    ? "AI order assistant"
    : "Website checkout";
}

export function isBotPlacedOrder(placedVia?: OrderPlacedVia | string | null) {
  return normalizeOrderPlacedVia(placedVia) === "ai_bot";
}
