import type {
  PromotionAd,
  PromotionAdPublic,
  PromotionAudience,
  PromotionPlacement,
} from "@/lib/promotions-cms";
import {
  normalizeClientTier,
  type ClientTier,
} from "@/lib/product-purchase-eligibility";

function parseDate(value?: string) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function promotionScheduleActive(
  ad: Pick<PromotionAd, "enabled" | "startAt" | "endAt">,
  now = new Date(),
) {
  if (!ad.enabled) return false;
  const start = parseDate(ad.startAt);
  const end = parseDate(ad.endAt);
  if (!start || !end) return false;
  const t = now.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function audienceMatchesPromotion(
  audience: PromotionAudience,
  ctx: { loggedIn: boolean; clientTier: ClientTier },
) {
  if (audience === "all") return true;
  if (!ctx.loggedIn) return false;
  if (audience === "dealers") return ctx.clientTier === "dealer";
  if (audience === "premium") {
    return ctx.clientTier === "premium" || ctx.clientTier === "dealer";
  }
  return false;
}

export function listActivePromotions(
  ads: PromotionAd[],
  placement: PromotionPlacement,
  ctx: { loggedIn: boolean; clientTier?: ClientTier },
  now = new Date(),
): PromotionAdPublic[] {
  const tier = normalizeClientTier(ctx.clientTier);
  return ads
    .filter(
      (ad) =>
        ad.placement === placement &&
        promotionScheduleActive(ad, now) &&
        audienceMatchesPromotion(ad.audience, {
          loggedIn: ctx.loggedIn,
          clientTier: tier,
        }),
    )
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .map((ad) => ({
      id: ad.id,
      title: ad.title,
      image: ad.image,
      ctaLabel: ad.ctaLabel,
      ctaHref: ad.ctaHref,
      placement: ad.placement,
      priority: ad.priority,
    }));
}
