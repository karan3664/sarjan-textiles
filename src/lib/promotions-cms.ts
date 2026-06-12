export type PromotionPlacement = "home" | "categories" | "web_home";

export type PromotionAudience = "all" | "dealers" | "premium";

export type PromotionAd = {
  id: string;
  title: string;
  image: string;
  ctaLabel?: string;
  ctaHref: string;
  placement: PromotionPlacement;
  audience: PromotionAudience;
  startAt: string;
  endAt: string;
  priority: number;
  enabled: boolean;
};

export type PromotionAdPublic = Pick<
  PromotionAd,
  "id" | "title" | "image" | "ctaLabel" | "ctaHref" | "placement" | "priority"
>;

export type PromotionEventType = "view" | "click";

export type PromotionAnalyticsRow = {
  adId: string;
  title: string;
  placement: PromotionPlacement;
  views: number;
  clicks: number;
  ctr: number;
  lastEventAt?: string;
};

export const promotionPlacementOptions: Array<{
  id: PromotionPlacement;
  label: string;
}> = [
  { id: "web_home", label: "Website homepage" },
  { id: "home", label: "Mobile app home" },
  { id: "categories", label: "Categories (web + app)" },
];

export const promotionAudienceOptions: Array<{
  id: PromotionAudience;
  label: string;
}> = [
  { id: "all", label: "All visitors" },
  { id: "premium", label: "Premium clients" },
  { id: "dealers", label: "Dealer clients" },
];
