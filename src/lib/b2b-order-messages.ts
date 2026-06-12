/** Shared B2B order / stock copy for web storefront. */

export const B2B_STOCK_INDICATIVE_PDP = [
  "Stock availability is indicative only.",
  "Orders are subject to stock verification and approval by Sarjan Textiles.",
  "If requested quantity exceeds available stock, production timelines will be communicated by our team.",
] as const;

export const B2B_CART_EXCEEDS_STOCK =
  "Additional production may be required. Our team will confirm delivery timelines after order review.";

export const B2B_CHECKOUT_APPROVAL_NOTICE = [
  "Orders are subject to stock verification and approval.",
  "If stock is unavailable, additional production time may be required.",
  "Our team will contact you before confirming the order.",
] as const;

export const B2B_ORDER_EXCEEDS_STOCK_NOTICE = [
  "This quantity exceeds current available stock.",
  "We will confirm availability and production timelines before approval.",
] as const;

export const B2B_ORDER_SUCCESS_TITLE = "Order Submitted Successfully";

export const B2B_ORDER_SUCCESS_BODY = [
  "Status: Pending Approval",
  "Our team will review stock availability and production timelines.",
  "You will receive confirmation shortly.",
] as const;

export function formatAvailablePieces(pieces: number) {
  return `${pieces.toLocaleString("en-IN")} Piece${pieces === 1 ? "" : "s"}`;
}
