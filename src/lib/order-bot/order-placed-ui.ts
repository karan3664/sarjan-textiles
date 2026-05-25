import type { BotNavAction } from "@/lib/order-bot/types";

export const ORDER_BOT_SUPPRESS_AUTO_OPEN_KEY =
  "sarjan-order-bot-suppress-auto-open";

export function orderDetailsHref(orderId: string) {
  return `/my-account-orders-details?orderId=${encodeURIComponent(orderId)}`;
}

export function orderPlacedNavActions(orderId: string): BotNavAction[] {
  return [
    {
      label: "View order details",
      href: orderDetailsHref(orderId),
    },
  ];
}

export function suppressOrderBotAutoOpen() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ORDER_BOT_SUPPRESS_AUTO_OPEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearOrderBotAutoOpenSuppress() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ORDER_BOT_SUPPRESS_AUTO_OPEN_KEY);
  } catch {
    /* ignore */
  }
}

export function isOrderBotAutoOpenSuppressed() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ORDER_BOT_SUPPRESS_AUTO_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}
