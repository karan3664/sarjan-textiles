"use client";

import type {
  PromotionEventType,
  PromotionPlacement,
} from "@/lib/promotions-cms";
import { clientAuthJsonHeaders } from "@/lib/client-auth-browser";

export function promotionViewSessionKey(adId: string) {
  return `sarjan_promo_view_${adId}`;
}

export function hasRecordedPromotionView(adId: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(promotionViewSessionKey(adId)) === "1";
  } catch {
    return false;
  }
}

export function markPromotionViewRecorded(adId: string) {
  try {
    window.sessionStorage.setItem(promotionViewSessionKey(adId), "1");
  } catch {
    /* ignore */
  }
}

export async function trackPromotionEvent(input: {
  adId: string;
  event: PromotionEventType;
  placement: PromotionPlacement;
}) {
  try {
    await fetch("/api/promotions/events", {
      method: "POST",
      headers: clientAuthJsonHeaders(),
      credentials: "include",
      body: JSON.stringify({
        ...input,
        platform: "web",
      }),
      keepalive: true,
    });
  } catch {
    /* never block UI */
  }
}
