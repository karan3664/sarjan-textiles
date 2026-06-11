import type { AppLocale, LocalizedText } from "@/lib/localized-text";
import { coerceLocalized, pickLocalized } from "@/lib/localized-text";

function readEnglish(value: string | LocalizedText | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return value.en?.trim() ?? "";
}

export type MobileBrandingCampaignStatus =
  | "draft"
  | "active"
  | "scheduled"
  | "expired";

export type MobileBrandingCampaignType =
  | "marketing"
  | "festival"
  | "premium"
  | "dealer"
  | "default";

export type MobileBrandingAnimationTemplate =
  | "launch"
  | "mega_sale"
  | "prime_day"
  | "anniversary"
  | "dealer_expo"
  | "festival_raksha_bandhan"
  | "festival_navratri"
  | "festival_diwali"
  | "festival_uttarayan"
  | "festival_holi"
  | "festival_christmas"
  | "festival_new_year"
  | "premium"
  | "dealer"
  | "default";

export type MobileBrandingCampaign = {
  id: string;
  enabled: boolean;
  campaignName: string;
  campaignType: MobileBrandingCampaignType;
  animationTemplate: MobileBrandingAnimationTemplate;
  startAt: string;
  endAt: string;
  priority: number;
  splashAnimationEnabled: boolean;
  dynamicIconEnabled: boolean;
  themeEnabled: boolean;
  ctaEnabled: boolean;
  status: MobileBrandingCampaignStatus;
  iconId?: string;
  durationMs?: number;
  skipAfterMs?: number;
  headline?: string;
  subheadline?: string;
  line3?: string;
  ctaLabel?: string;
  ctaHref?: string;
  themePrimary?: string;
  themeAccent?: string;
};

export type MobileBrandingCampaignStored = Omit<
  MobileBrandingCampaign,
  "headline" | "subheadline" | "line3" | "ctaLabel"
> & {
  headline?: LocalizedText;
  subheadline?: LocalizedText;
  line3?: LocalizedText;
  ctaLabel?: LocalizedText;
};

export type MobileBrandingConfig = {
  enabled: boolean;
  campaigns: MobileBrandingCampaign[];
};

export type MobileBrandingConfigStored = {
  enabled: boolean;
  campaigns: MobileBrandingCampaignStored[];
};

export type MobileBrandingEventType =
  | "splash_viewed"
  | "splash_skipped"
  | "splash_completed"
  | "campaign_conversion"
  | "campaign_click"
  | "icon_activation";

export type MobileBrandingAnalyticsRow = {
  campaignId: string;
  campaignName: string;
  views: number;
  skipped: number;
  completed: number;
  conversions: number;
  clicks: number;
  iconActivations: number;
  completionRate: number;
  conversionRate: number;
  lastEventAt?: string;
};

export const mobileBrandingCampaignTypeOptions: Array<{
  id: MobileBrandingCampaignType;
  label: string;
}> = [
  { id: "marketing", label: "Marketing campaign" },
  { id: "festival", label: "Festival campaign" },
  { id: "premium", label: "Premium member theme" },
  { id: "dealer", label: "Dealer theme" },
  { id: "default", label: "Default theme" },
];

export const mobileBrandingAnimationOptions: Array<{
  id: MobileBrandingAnimationTemplate;
  label: string;
  defaultIconId?: string;
}> = [
  { id: "launch", label: "Launch experience", defaultIconId: "launch_event" },
  { id: "mega_sale", label: "Mega textile sale", defaultIconId: "mega_sale" },
  { id: "prime_day", label: "Sarjan Prime Days", defaultIconId: "prime_day" },
  {
    id: "anniversary",
    label: "Sarjan anniversary",
    defaultIconId: "anniversary_sale",
  },
  { id: "dealer_expo", label: "Dealer expo", defaultIconId: "dealer_expo" },
  {
    id: "festival_raksha_bandhan",
    label: "Raksha Bandhan",
    defaultIconId: "raksha_bandhan",
  },
  { id: "festival_navratri", label: "Navratri", defaultIconId: "navratri" },
  { id: "festival_diwali", label: "Diwali", defaultIconId: "diwali" },
  { id: "festival_uttarayan", label: "Uttarayan", defaultIconId: "uttarayan" },
  { id: "festival_holi", label: "Holi", defaultIconId: "holi" },
  {
    id: "festival_christmas",
    label: "Christmas",
    defaultIconId: "christmas",
  },
  { id: "festival_new_year", label: "New Year", defaultIconId: "new_year" },
  { id: "premium", label: "Premium member", defaultIconId: "premium" },
  { id: "dealer", label: "Dealer partner", defaultIconId: "dealer" },
  { id: "default", label: "Default Sarjan", defaultIconId: "default" },
];

const MAX_SPLASH_MS = 3000;
const DEFAULT_SKIP_MS = 1000;

function parseDate(value?: string) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function computeCampaignStatus(
  campaign: Pick<
    MobileBrandingCampaign,
    "enabled" | "status" | "startAt" | "endAt"
  >,
  now = new Date(),
): MobileBrandingCampaignStatus {
  if (campaign.status === "draft" || !campaign.enabled) return "draft";
  const start = parseDate(campaign.startAt);
  const end = parseDate(campaign.endAt);
  if (!start || !end) return "draft";
  const t = now.getTime();
  if (t < start.getTime()) return "scheduled";
  if (t > end.getTime()) return "expired";
  return "active";
}

function campaignTypePriority(type: MobileBrandingCampaignType) {
  switch (type) {
    case "marketing":
      return 500;
    case "festival":
      return 400;
    case "premium":
      return 300;
    case "dealer":
      return 200;
    default:
      return 100;
  }
}

export type BrandingResolutionContext = {
  now?: Date;
  isPremiumUser?: boolean;
  isDealer?: boolean;
  reducedMotion?: boolean;
};

export function resolveActiveBrandingCampaign(
  config: MobileBrandingConfig | undefined,
  ctx: BrandingResolutionContext = {},
): MobileBrandingCampaign | null {
  if (!config?.enabled) return null;
  const now = ctx.now ?? new Date();

  const candidates = (config.campaigns ?? [])
    .map((campaign) => ({
      ...campaign,
      status: computeCampaignStatus(campaign, now),
    }))
    .filter((campaign) => campaign.status === "active");

  if (!candidates.length) return null;

  const premium = ctx.isPremiumUser
    ? candidates.find((c) => c.campaignType === "premium")
    : null;
  const dealer =
    !premium && ctx.isDealer
      ? candidates.find((c) => c.campaignType === "dealer")
      : null;

  const ranked = [...candidates].sort((a, b) => {
    const typeDiff =
      campaignTypePriority(b.campaignType) -
      campaignTypePriority(a.campaignType);
    if (typeDiff !== 0) return typeDiff;
    return (b.priority ?? 0) - (a.priority ?? 0);
  });

  const winner = premium ?? dealer ?? ranked[0] ?? null;
  if (!winner) return null;

  if (ctx.reducedMotion && !winner.splashAnimationEnabled) {
    return null;
  }

  return {
    ...winner,
    durationMs: Math.min(
      MAX_SPLASH_MS,
      Math.max(800, winner.durationMs ?? MAX_SPLASH_MS),
    ),
    skipAfterMs: Math.min(
      winner.durationMs ?? MAX_SPLASH_MS,
      Math.max(500, winner.skipAfterMs ?? DEFAULT_SKIP_MS),
    ),
  };
}

function toStoredCampaign(
  campaign: Partial<MobileBrandingCampaign> | MobileBrandingCampaignStored,
  index: number,
): MobileBrandingCampaignStored | null {
  const id = String(campaign.id ?? `branding-${index + 1}`).trim();
  if (!id) return null;
  const animationTemplate =
    campaign.animationTemplate ??
    ("default" as MobileBrandingAnimationTemplate);
  const preset = mobileBrandingAnimationOptions.find(
    (item) => item.id === animationTemplate,
  );

  return {
    id,
    enabled: campaign.enabled !== false,
    campaignName:
      readEnglish(
        (campaign as MobileBrandingCampaign).campaignName ??
          (campaign as MobileBrandingCampaignStored).campaignName,
      ) ||
      preset?.label ||
      "Campaign",
    campaignType:
      campaign.campaignType ??
      (animationTemplate.startsWith("festival_") ? "festival" : "marketing"),
    animationTemplate,
    startAt: campaign.startAt?.trim() || new Date().toISOString(),
    endAt:
      campaign.endAt?.trim() ||
      new Date(Date.now() + 7 * 86400000).toISOString(),
    priority: Number(campaign.priority ?? 0) || 0,
    splashAnimationEnabled: campaign.splashAnimationEnabled !== false,
    dynamicIconEnabled: campaign.dynamicIconEnabled !== false,
    themeEnabled: campaign.themeEnabled !== false,
    ctaEnabled: campaign.ctaEnabled !== false,
    status: campaign.status ?? "draft",
    iconId: campaign.iconId?.trim() || preset?.defaultIconId || "default",
    durationMs: Math.min(
      MAX_SPLASH_MS,
      Math.max(800, Number(campaign.durationMs ?? 2000) || 2000),
    ),
    skipAfterMs: Math.min(
      MAX_SPLASH_MS,
      Math.max(
        500,
        Number(campaign.skipAfterMs ?? DEFAULT_SKIP_MS) || DEFAULT_SKIP_MS,
      ),
    ),
    headline: campaign.headline
      ? coerceLocalized(campaign.headline as string | LocalizedText)
      : undefined,
    subheadline: campaign.subheadline
      ? coerceLocalized(campaign.subheadline as string | LocalizedText)
      : undefined,
    line3: campaign.line3
      ? coerceLocalized(campaign.line3 as string | LocalizedText)
      : undefined,
    ctaLabel: campaign.ctaLabel
      ? coerceLocalized(campaign.ctaLabel as string | LocalizedText)
      : undefined,
    ctaHref: campaign.ctaHref?.trim() || undefined,
    themePrimary: campaign.themePrimary?.trim() || "#0A0A0A",
    themeAccent: campaign.themeAccent?.trim() || "#C89B3C",
  };
}

export function defaultMobileBrandingConfig(): MobileBrandingConfigStored {
  const launchStart = "2026-06-17T00:00:00.000Z";
  const launchEnd = "2026-06-24T23:59:59.000Z";

  const presets: Array<Omit<MobileBrandingCampaign, "status">> = [
    {
      id: "launch-experience",
      enabled: true,
      campaignName: "Launch Experience",
      campaignType: "marketing",
      animationTemplate: "launch",
      startAt: launchStart,
      endAt: launchEnd,
      priority: 100,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "launch_event",
      durationMs: 3000,
      skipAfterMs: 1000,
      headline: "SARJAN TEXTILES",
      subheadline: "Premium Fabrics.",
      line3: "Timeless Elegance.",
      themePrimary: "#0A0A0A",
      themeAccent: "#C89B3C",
    },
    {
      id: "mega-textile-sale",
      enabled: true,
      campaignName: "Mega Textile Sale",
      campaignType: "marketing",
      animationTemplate: "mega_sale",
      startAt: "2026-07-01T00:00:00.000Z",
      endAt: "2026-07-07T23:59:59.000Z",
      priority: 90,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: true,
      iconId: "mega_sale",
      durationMs: 2000,
      skipAfterMs: 1000,
      headline: "MEGA SALE",
      subheadline: "Up to 40% Off",
      ctaLabel: "Enter App",
      themePrimary: "#0A0A0A",
      themeAccent: "#D4AF37",
    },
    {
      id: "sarjan-prime-days",
      enabled: true,
      campaignName: "Sarjan Prime Days",
      campaignType: "marketing",
      animationTemplate: "prime_day",
      startAt: "2026-08-01T00:00:00.000Z",
      endAt: "2026-08-03T23:59:59.000Z",
      priority: 85,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "prime_day",
      durationMs: 2000,
      headline: "SARJAN PRIME DAYS",
      subheadline: "Exclusive Business Deals",
      themePrimary: "#0A0A0A",
      themeAccent: "#C89B3C",
    },
    {
      id: "sarjan-anniversary",
      enabled: true,
      campaignName: "Sarjan Anniversary",
      campaignType: "marketing",
      animationTemplate: "anniversary",
      startAt: "2026-09-01T00:00:00.000Z",
      endAt: "2026-09-07T23:59:59.000Z",
      priority: 80,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "anniversary_sale",
      durationMs: 2000,
      headline: "Thank You For Growing With Us",
      themePrimary: "#0A0A0A",
      themeAccent: "#D4AF37",
    },
    {
      id: "dealer-expo",
      enabled: true,
      campaignName: "Dealer Expo",
      campaignType: "marketing",
      animationTemplate: "dealer_expo",
      startAt: "2026-10-01T00:00:00.000Z",
      endAt: "2026-10-05T23:59:59.000Z",
      priority: 75,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "dealer_expo",
      durationMs: 2000,
      headline: "Welcome Partners",
      themePrimary: "#0B1F3A",
      themeAccent: "#C89B3C",
    },
    {
      id: "festival-raksha-bandhan",
      enabled: true,
      campaignName: "Raksha Bandhan",
      campaignType: "festival",
      animationTemplate: "festival_raksha_bandhan",
      startAt: "2026-08-20T00:00:00.000Z",
      endAt: "2026-08-29T23:59:59.000Z",
      priority: 70,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "raksha_bandhan",
      durationMs: 2000,
      themePrimary: "#5C2E00",
      themeAccent: "#E8A317",
    },
    {
      id: "festival-navratri",
      enabled: true,
      campaignName: "Navratri",
      campaignType: "festival",
      animationTemplate: "festival_navratri",
      startAt: "2026-10-10T00:00:00.000Z",
      endAt: "2026-10-18T23:59:59.000Z",
      priority: 70,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "navratri",
      durationMs: 2000,
      themePrimary: "#6B0F1A",
      themeAccent: "#D4AF37",
    },
    {
      id: "festival-diwali",
      enabled: true,
      campaignName: "Diwali",
      campaignType: "festival",
      animationTemplate: "festival_diwali",
      startAt: "2026-10-20T00:00:00.000Z",
      endAt: "2026-11-05T23:59:59.000Z",
      priority: 72,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "diwali",
      durationMs: 3000,
      themePrimary: "#0B1533",
      themeAccent: "#D4AF37",
    },
    {
      id: "festival-uttarayan",
      enabled: true,
      campaignName: "Uttarayan",
      campaignType: "festival",
      animationTemplate: "festival_uttarayan",
      startAt: "2027-01-10T00:00:00.000Z",
      endAt: "2027-01-16T23:59:59.000Z",
      priority: 70,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "uttarayan",
      durationMs: 2000,
      themePrimary: "#0D4F8B",
      themeAccent: "#D4AF37",
    },
    {
      id: "festival-holi",
      enabled: true,
      campaignName: "Holi",
      campaignType: "festival",
      animationTemplate: "festival_holi",
      startAt: "2027-03-10T00:00:00.000Z",
      endAt: "2027-03-15T23:59:59.000Z",
      priority: 70,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "holi",
      durationMs: 2000,
      themePrimary: "#2D1654",
      themeAccent: "#E8A317",
    },
    {
      id: "festival-christmas",
      enabled: true,
      campaignName: "Christmas",
      campaignType: "festival",
      animationTemplate: "festival_christmas",
      startAt: "2026-12-20T00:00:00.000Z",
      endAt: "2026-12-31T23:59:59.000Z",
      priority: 70,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "christmas",
      durationMs: 2000,
      themePrimary: "#0F2E1A",
      themeAccent: "#D4AF37",
    },
    {
      id: "festival-new-year",
      enabled: true,
      campaignName: "New Year",
      campaignType: "festival",
      animationTemplate: "festival_new_year",
      startAt: "2026-12-28T00:00:00.000Z",
      endAt: "2027-01-05T23:59:59.000Z",
      priority: 71,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "new_year",
      durationMs: 3000,
      themePrimary: "#0A0A0A",
      themeAccent: "#D4AF37",
    },
    {
      id: "premium-member-theme",
      enabled: true,
      campaignName: "Premium Member",
      campaignType: "premium",
      animationTemplate: "premium",
      startAt: "2020-01-01T00:00:00.000Z",
      endAt: "2099-12-31T23:59:59.000Z",
      priority: 50,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "premium",
      durationMs: 2000,
      headline: "Premium Member",
      themePrimary: "#0A0A0A",
      themeAccent: "#D4AF37",
    },
    {
      id: "dealer-partner-theme",
      enabled: true,
      campaignName: "Dealer Partner",
      campaignType: "dealer",
      animationTemplate: "dealer",
      startAt: "2020-01-01T00:00:00.000Z",
      endAt: "2099-12-31T23:59:59.000Z",
      priority: 40,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      iconId: "dealer",
      durationMs: 2000,
      headline: "Welcome Dealer Partner",
      themePrimary: "#0B1F3A",
      themeAccent: "#C89B3C",
    },
  ];

  return {
    enabled: true,
    campaigns: presets
      .map((campaign, index) =>
        toStoredCampaign({ ...campaign, status: "scheduled" }, index),
      )
      .filter((item): item is MobileBrandingCampaignStored => item != null),
  };
}

export function normalizeMobileBrandingConfig(
  input?: Partial<MobileBrandingConfig | MobileBrandingConfigStored>,
): MobileBrandingConfigStored {
  const defaults = defaultMobileBrandingConfig();
  if (!input) return defaults;

  const campaigns = Array.isArray(input.campaigns)
    ? input.campaigns
        .map((campaign, index) => toStoredCampaign(campaign, index))
        .filter((item): item is MobileBrandingCampaignStored => item != null)
    : defaults.campaigns;

  return {
    enabled: input.enabled !== false,
    campaigns: campaigns.length ? campaigns : defaults.campaigns,
  };
}

export function resolveMobileBrandingCampaign(
  stored: MobileBrandingConfigStored,
  locale: AppLocale,
  ctx: BrandingResolutionContext = {},
): MobileBrandingCampaign | null {
  const pick = (text?: LocalizedText) =>
    text ? pickLocalized(text, locale) : undefined;

  const resolved: MobileBrandingConfig = {
    enabled: stored.enabled,
    campaigns: stored.campaigns.map((campaign) => ({
      ...campaign,
      headline: pick(campaign.headline),
      subheadline: pick(campaign.subheadline),
      line3: pick(campaign.line3),
      ctaLabel: pick(campaign.ctaLabel),
    })),
  };

  return resolveActiveBrandingCampaign(resolved, ctx);
}

export function flattenMobileBrandingForAdmin(
  stored: MobileBrandingConfigStored,
): MobileBrandingConfig {
  return {
    enabled: stored.enabled,
    campaigns: stored.campaigns.map((campaign) => ({
      ...campaign,
      headline: readEnglish(campaign.headline),
      subheadline: readEnglish(campaign.subheadline),
      line3: readEnglish(campaign.line3),
      ctaLabel: readEnglish(campaign.ctaLabel),
    })),
  };
}

export function brandingCampaignsForAppIconSync(
  stored: MobileBrandingConfigStored,
): Array<{
  id: string;
  iconId: string;
  startAt: string;
  endAt: string;
  enabled?: boolean;
  priority?: number;
  label?: string;
}> {
  return stored.campaigns
    .filter((campaign) => campaign.dynamicIconEnabled !== false)
    .map((campaign) => ({
      id: campaign.id,
      iconId: campaign.iconId ?? "default",
      startAt: campaign.startAt,
      endAt: campaign.endAt,
      enabled: campaign.enabled,
      priority:
        (campaign.priority ?? 0) + campaignTypePriority(campaign.campaignType),
      label: campaign.campaignName,
    }));
}
