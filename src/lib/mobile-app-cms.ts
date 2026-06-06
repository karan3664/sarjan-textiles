import type { CmsHome, CmsSiteSettings } from "@/lib/cms-store";
import { translateEnglishBatch } from "@/lib/auto-translate";
import {
  applyProfileMenuTranslations,
  collectProfileMenuTranslationJobs,
  flattenMobileProfileMenusForAdmin,
  normalizeMobileProfileMenus,
  resolveMobileProfileMenus,
  type MobileProfileMenus,
  type MobileProfileMenusStored,
} from "@/lib/mobile-profile-menus";
import {
  coerceLocalized,
  localizedFromEnglish,
  markTranslationAttempted,
  mergeTranslation,
  needsTranslation,
  pickLocalized,
  type AppLocale,
  type LocalizedText,
} from "@/lib/localized-text";

/** English-only shape used in admin UI and app API responses. */
export type MobileOnboardingSlide = {
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
  image?: string;
  enabled?: boolean;
};

export type MobileSplashConfig = {
  tagline: string;
  loadingText: string;
  logoUrl?: string;
  minDurationMs: number;
};

export type MobileHomeHeaderConfig = {
  promoTitle: string;
  promoSubtitle: string;
  exploreLabel: string;
  searchPlaceholder: string;
  showVisualSearch: boolean;
};

export type MobileHomeSectionType =
  | "banner"
  | "categories"
  | "collections"
  | "featured"
  | "bestSellers"
  | "newArrivals"
  | "promoBanners"
  | "marquee"
  | "highlights"
  | "services"
  | "offer"
  | "dealEnds"
  | "custom"
  | "quickReorder"
  | "openOrders"
  | "recentlyViewed"
  | "allProducts"
  | "testimonials"
  | "instagram";

export type MobileHomeSection = {
  id: string;
  type: MobileHomeSectionType;
  enabled: boolean;
  title?: string;
  subtitle?: string;
  image?: string;
  body?: string;
  ctaLabel?: string;
  /** product slug, category name, or in-app path */
  ctaTarget?: string;
  /** ISO date for deal countdown sections */
  endDate?: string;
  backgroundColor?: string;
  accentColor?: string;
};

export type MobileAppConfig = {
  splash: MobileSplashConfig;
  onboarding: {
    enabled: boolean;
    slides: MobileOnboardingSlide[];
  };
  homeHeader: MobileHomeHeaderConfig;
  homeSections: MobileHomeSection[];
  profileMenus: MobileProfileMenus;
  footerCredit: string;
  support: {
    phone: string;
    email: string;
    whatsapp: string;
  };
};

type StoredSlide = Omit<MobileOnboardingSlide, "title" | "subtitle"> & {
  title: LocalizedText;
  subtitle: LocalizedText;
};

type StoredSection = Omit<
  MobileHomeSection,
  "title" | "subtitle" | "body" | "ctaLabel"
> & {
  title?: LocalizedText;
  subtitle?: LocalizedText;
  body?: LocalizedText;
  ctaLabel?: LocalizedText;
};

export type MobileLocalizedExtras = {
  brandName: LocalizedText;
  marqueeLines: LocalizedText[];
  highlights: Array<{ value: string; label: LocalizedText }>;
  services: Array<{ icon?: string; title: LocalizedText; body: LocalizedText }>;
};

/** Persisted CMS document — all copy is localized (admin edits English only). */
export type MobileAppConfigStored = {
  splash: Omit<MobileSplashConfig, "tagline" | "loadingText"> & {
    tagline: LocalizedText;
    loadingText: LocalizedText;
  };
  onboarding: {
    enabled: boolean;
    slides: StoredSlide[];
  };
  homeHeader: {
    promoTitle: LocalizedText;
    promoSubtitle: LocalizedText;
    exploreLabel: LocalizedText;
    searchPlaceholder: LocalizedText;
    showVisualSearch: boolean;
  };
  homeSections: StoredSection[];
  profileMenus: MobileProfileMenusStored;
  footerCredit: LocalizedText;
  support: MobileAppConfig["support"];
  localizedExtras?: MobileLocalizedExtras;
};

export type MobileAppPublicConfig = MobileAppConfig & {
  brandName: string;
  logoUrl?: string;
  marqueeLines: string[];
  highlights: Array<{ value: string; label: string }>;
  services: Array<{ icon?: string; title: string; body: string }>;
  updatedAt: string;
  locale: AppLocale;
};

const MOBILE_ICON_OPTIONS = [
  "sparkles",
  "tag",
  "cart",
  "truck",
  "shield",
  "star",
] as const;

export const mobileHomeSectionOptions: Array<{
  type: MobileHomeSectionType;
  label: string;
}> = [
  { type: "banner", label: "Hero banners" },
  { type: "categories", label: "Shop by category" },
  { type: "collections", label: "Collections rail" },
  { type: "featured", label: "Featured products" },
  { type: "bestSellers", label: "Best sellers" },
  { type: "newArrivals", label: "New arrivals" },
  { type: "promoBanners", label: "Promo banners" },
  { type: "offer", label: "Offer / promo block" },
  { type: "dealEnds", label: "Deal ends countdown" },
  { type: "marquee", label: "Marquee ticker" },
  { type: "highlights", label: "Highlights strip" },
  { type: "services", label: "Trust / services icons" },
  { type: "custom", label: "Custom text + CTA" },
  { type: "quickReorder", label: "Quick reorder (B2B)" },
  { type: "openOrders", label: "Open orders snapshot (B2B)" },
  { type: "recentlyViewed", label: "Recently viewed" },
  { type: "allProducts", label: "All products grid" },
  { type: "testimonials", label: "Testimonials" },
  { type: "instagram", label: "Instagram gallery" },
];

function readEnglish(value: string | LocalizedText | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return value.en.trim();
}

function homeMeta(home: CmsHome) {
  return home as CmsHome & {
    topPicksTitle?: string;
    topPicksDescription?: string;
    testimonialsTitle?: string;
    testimonialsDescription?: string;
  };
}

export function defaultMobileAppConfig(
  site: CmsSiteSettings,
  home: CmsHome,
): MobileAppConfig {
  const meta = homeMeta(home);
  return {
    splash: {
      tagline: "Premium Wholesale Ethnic Wear",
      loadingText: "Loading your collection…",
      logoUrl: site.logoIcon || site.logo,
      minDurationMs: 2200,
    },
    onboarding: {
      enabled: true,
      slides: [
        {
          id: "collection",
          title: "Premium Wholesale Collection",
          subtitle:
            "Browse curated Kurtas, Ajrakh, Mashru and more — direct from Sarjan Textiles.",
          icon: "sparkles",
          enabled: true,
        },
        {
          id: "pricing",
          title: "Direct Factory Pricing",
          subtitle:
            "MOQ-based sets, transparent wholesale rates, and 90-day credit for approved clients.",
          icon: "tag",
          enabled: true,
        },
        {
          id: "ordering",
          title: "Easy Ordering Process",
          subtitle:
            "Add to cart, checkout with saved address, and track dispatch in the app.",
          icon: "cart",
          enabled: true,
        },
      ],
    },
    homeHeader: {
      promoTitle: home.hero?.title ?? "Premium wholesale ethnic wear",
      promoSubtitle:
        home.hero?.description ??
        "MOQ sets · curated collections · pan-India dispatch",
      exploreLabel: home.hero?.primaryCta?.label ?? "Explore collections",
      searchPlaceholder: "Search kurtas, ajrakh, SKU…",
      showVisualSearch: true,
    },
    homeSections: [
      { id: "banner", type: "banner", enabled: true },
      {
        id: "categories",
        type: "categories",
        enabled: true,
        title: "Shop by Category",
        subtitle: "Browse wholesale lines",
      },
      { id: "marquee", type: "marquee", enabled: true, title: "Updates" },
      {
        id: "highlights",
        type: "highlights",
        enabled: true,
        title: "Why Sarjan",
      },
      {
        id: "services",
        type: "services",
        enabled: true,
        title: "Wholesale benefits",
      },
      { id: "openOrders", type: "openOrders", enabled: true },
      { id: "quickReorder", type: "quickReorder", enabled: true },
      {
        id: "collections",
        type: "collections",
        enabled: true,
        title: "Curated collections",
        subtitle: "Seasonal lines for your store",
      },
      {
        id: "featured",
        type: "featured",
        enabled: true,
        title: meta.topPicksTitle ?? "Featured",
        subtitle: meta.topPicksDescription ?? "Handpicked for you",
      },
      {
        id: "bestSellers",
        type: "bestSellers",
        enabled: true,
        title: "Best Sellers",
        subtitle: "Most ordered this season",
      },
      {
        id: "newArrivals",
        type: "newArrivals",
        enabled: true,
        title: "New Arrivals",
        subtitle: "Fresh off the loom",
      },
      { id: "promoBanners", type: "promoBanners", enabled: true },
      { id: "recentlyViewed", type: "recentlyViewed", enabled: true },
      {
        id: "allProducts",
        type: "allProducts",
        enabled: true,
        title: "All Products",
        subtitle: "Explore the full catalogue",
      },
      {
        id: "testimonials",
        type: "testimonials",
        enabled: true,
        title: meta.testimonialsTitle ?? "What retailers say",
        subtitle:
          meta.testimonialsDescription ?? "Trusted by boutiques across India",
      },
      {
        id: "instagram",
        type: "instagram",
        enabled: true,
        title: "Follow us on Instagram",
        subtitle: "@sarjantextiles",
      },
    ],
    profileMenus: flattenMobileProfileMenusForAdmin(
      normalizeMobileProfileMenus(undefined),
    ),
    footerCredit:
      site.footerCredit ?? "Designed & Developed by Karan Digital Labs",
    support: {
      phone: site.phone ?? "",
      email: site.email ?? "",
      whatsapp: site.phone?.replace(/\s/g, "") ?? "",
    },
  };
}

function toStoredSlide(
  slide: Partial<MobileOnboardingSlide> | StoredSlide,
  index: number,
): StoredSlide | null {
  const title = readEnglish(slide.title as string | LocalizedText | undefined);
  if (!title || slide.enabled === false) return null;
  return {
    id: String(slide.id ?? `slide-${index + 1}`),
    title: coerceLocalized(slide.title ?? title),
    subtitle: coerceLocalized(slide.subtitle ?? ""),
    icon: MOBILE_ICON_OPTIONS.includes(
      slide.icon as (typeof MOBILE_ICON_OPTIONS)[number],
    )
      ? slide.icon
      : "sparkles",
    image: slide.image?.trim() || undefined,
    enabled: true,
  };
}

function toStoredSection(
  section: Partial<MobileHomeSection> | StoredSection,
  index: number,
): StoredSection | null {
  const type = section.type;
  if (!type || !mobileHomeSectionOptions.some((item) => item.type === type)) {
    return null;
  }
  return {
    id: String(section.id ?? `${type}-${index + 1}`),
    type,
    enabled: section.enabled !== false,
    title: section.title
      ? coerceLocalized(section.title as string | LocalizedText)
      : undefined,
    subtitle: section.subtitle
      ? coerceLocalized(section.subtitle as string | LocalizedText)
      : undefined,
    image: section.image?.trim() || undefined,
    body: section.body
      ? coerceLocalized(section.body as string | LocalizedText)
      : undefined,
    ctaLabel: section.ctaLabel
      ? coerceLocalized(section.ctaLabel as string | LocalizedText)
      : undefined,
    ctaTarget: section.ctaTarget?.trim() || undefined,
    endDate: section.endDate?.trim() || undefined,
    backgroundColor: section.backgroundColor?.trim() || undefined,
    accentColor: section.accentColor?.trim() || undefined,
  };
}

function buildLocalizedExtrasFromHome(
  site: CmsSiteSettings,
  home: CmsHome,
  previous?: MobileLocalizedExtras,
): MobileLocalizedExtras {
  const marqueeLines = (home.marqueeTop ?? []).map((line, index) => {
    const prev = previous?.marqueeLines[index];
    const english = readEnglish(line);
    return coerceLocalized(prev?.en === english ? prev : line);
  });
  const highlights = (home.highlights ?? []).map((item, index) => {
    const prev = previous?.highlights[index];
    const labelEn = readEnglish(item.label);
    const label = coerceLocalized(
      prev?.label.en === labelEn ? prev.label : item.label,
    );
    return { value: item.value, label };
  });
  const services = (home.services ?? []).map((item, index) => {
    const prev = previous?.services[index];
    const titleEn = readEnglish(item.title);
    const bodyEn = readEnglish(item.body);
    return {
      icon: item.icon,
      title: coerceLocalized(
        prev?.title.en === titleEn ? prev.title : item.title,
      ),
      body: coerceLocalized(prev?.body.en === bodyEn ? prev.body : item.body),
    };
  });
  return {
    brandName: coerceLocalized(
      previous?.brandName.en === readEnglish(site.brandName)
        ? previous.brandName
        : site.brandName,
    ),
    marqueeLines,
    highlights,
    services,
  };
}

export function normalizeMobileAppConfig(
  input: Partial<MobileAppConfig | MobileAppConfigStored> | undefined,
  site: CmsSiteSettings,
  home: CmsHome,
): MobileAppConfigStored {
  const defaults = defaultMobileAppConfig(site, home);
  const base = input ?? defaults;

  const slides = Array.isArray(base.onboarding?.slides)
    ? base.onboarding.slides
        .map(toStoredSlide)
        .filter((slide): slide is StoredSlide => slide != null)
    : defaults.onboarding.slides
        .map((slide, index) => toStoredSlide(slide, index))
        .filter((slide): slide is StoredSlide => slide != null);

  const sections = Array.isArray(base.homeSections)
    ? base.homeSections
        .map(toStoredSection)
        .filter((section): section is StoredSection => section != null)
    : defaults.homeSections
        .map(toStoredSection)
        .filter((section): section is StoredSection => section != null);

  const splashInput = base.splash ?? defaults.splash;
  const headerInput = base.homeHeader ?? defaults.homeHeader;

  return {
    splash: {
      logoUrl:
        splashInput.logoUrl?.trim() ||
        defaults.splash.logoUrl ||
        site.logoIcon ||
        site.logo,
      minDurationMs: Math.max(
        800,
        Number(splashInput.minDurationMs ?? defaults.splash.minDurationMs) ||
          defaults.splash.minDurationMs,
      ),
      tagline: coerceLocalized(
        (splashInput as MobileSplashConfig).tagline ??
          (splashInput as { tagline?: LocalizedText }).tagline ??
          defaults.splash.tagline,
      ),
      loadingText: coerceLocalized(
        (splashInput as MobileSplashConfig).loadingText ??
          (splashInput as { loadingText?: LocalizedText }).loadingText ??
          defaults.splash.loadingText,
      ),
    },
    onboarding: {
      enabled: base.onboarding?.enabled !== false,
      slides: slides.length
        ? slides
        : defaults.onboarding.slides
            .map((slide, index) => toStoredSlide(slide, index))
            .filter((slide): slide is StoredSlide => slide != null),
    },
    homeHeader: {
      promoTitle: coerceLocalized(
        readEnglish(
          (headerInput as MobileHomeHeaderConfig).promoTitle ??
            (headerInput as { promoTitle?: LocalizedText }).promoTitle,
        ) || defaults.homeHeader.promoTitle,
      ),
      promoSubtitle: coerceLocalized(
        readEnglish(
          (headerInput as MobileHomeHeaderConfig).promoSubtitle ??
            (headerInput as { promoSubtitle?: LocalizedText }).promoSubtitle,
        ) || defaults.homeHeader.promoSubtitle,
      ),
      exploreLabel: coerceLocalized(
        readEnglish(
          (headerInput as MobileHomeHeaderConfig).exploreLabel ??
            (headerInput as { exploreLabel?: LocalizedText }).exploreLabel,
        ) || defaults.homeHeader.exploreLabel,
      ),
      searchPlaceholder: coerceLocalized(
        readEnglish(
          (headerInput as MobileHomeHeaderConfig).searchPlaceholder ??
            (headerInput as { searchPlaceholder?: LocalizedText })
              .searchPlaceholder,
        ) || defaults.homeHeader.searchPlaceholder,
      ),
      showVisualSearch:
        (headerInput as MobileHomeHeaderConfig).showVisualSearch !== false,
    },
    homeSections: sections.length
      ? sections
      : defaults.homeSections
          .map(toStoredSection)
          .filter((section): section is StoredSection => section != null),
    profileMenus: normalizeMobileProfileMenus(
      (base as MobileAppConfigStored).profileMenus ??
        (base as MobileAppConfig).profileMenus,
    ),
    footerCredit: coerceLocalized(
      readEnglish(
        (base as MobileAppConfig).footerCredit ??
          (base as MobileAppConfigStored).footerCredit,
      ) || defaults.footerCredit,
    ),
    support: {
      phone:
        base.support?.phone?.trim() ||
        defaults.support.phone ||
        site.phone ||
        "",
      email:
        base.support?.email?.trim() ||
        defaults.support.email ||
        site.email ||
        "",
      whatsapp:
        base.support?.whatsapp?.trim() ||
        defaults.support.whatsapp ||
        site.phone?.replace(/\s/g, "") ||
        "",
    },
    localizedExtras: buildLocalizedExtrasFromHome(
      site,
      home,
      (input as MobileAppConfigStored | undefined)?.localizedExtras,
    ),
  };
}

function queueText(
  bucket: Record<string, string>,
  key: string,
  text: LocalizedText,
) {
  if (needsTranslation(text)) {
    bucket[key] = text.en;
  }
}

function applyTranslations(
  stored: MobileAppConfigStored,
  translations: Record<string, { hi: string; gu: string }>,
  attemptedKeys?: Set<string>,
): MobileAppConfigStored {
  const pick = (key: string, text: LocalizedText) => {
    const translated = translations[key];
    if (translated) return mergeTranslation(text, translated.hi, translated.gu);
    if (attemptedKeys?.has(key)) return markTranslationAttempted(text);
    return text;
  };

  return {
    ...stored,
    splash: {
      ...stored.splash,
      tagline: pick("splash.tagline", stored.splash.tagline),
      loadingText: pick("splash.loadingText", stored.splash.loadingText),
    },
    onboarding: {
      ...stored.onboarding,
      slides: stored.onboarding.slides.map((slide, index) => ({
        ...slide,
        title: pick(`onboarding.${index}.title`, slide.title),
        subtitle: pick(`onboarding.${index}.subtitle`, slide.subtitle),
      })),
    },
    homeHeader: {
      ...stored.homeHeader,
      promoTitle: pick("homeHeader.promoTitle", stored.homeHeader.promoTitle),
      promoSubtitle: pick(
        "homeHeader.promoSubtitle",
        stored.homeHeader.promoSubtitle,
      ),
      exploreLabel: pick(
        "homeHeader.exploreLabel",
        stored.homeHeader.exploreLabel,
      ),
      searchPlaceholder: pick(
        "homeHeader.searchPlaceholder",
        stored.homeHeader.searchPlaceholder,
      ),
    },
    homeSections: stored.homeSections.map((section, index) => ({
      ...section,
      title: section.title
        ? pick(`section.${index}.title`, section.title)
        : undefined,
      subtitle: section.subtitle
        ? pick(`section.${index}.subtitle`, section.subtitle)
        : undefined,
      body: section.body
        ? pick(`section.${index}.body`, section.body)
        : undefined,
      ctaLabel: section.ctaLabel
        ? pick(`section.${index}.ctaLabel`, section.ctaLabel)
        : undefined,
    })),
    footerCredit: pick("footerCredit", stored.footerCredit),
    profileMenus: applyProfileMenuTranslations(
      stored.profileMenus,
      translations,
    ),
    localizedExtras: stored.localizedExtras
      ? {
          brandName: pick("extras.brandName", stored.localizedExtras.brandName),
          marqueeLines: stored.localizedExtras.marqueeLines.map((line, index) =>
            pick(`extras.marquee.${index}`, line),
          ),
          highlights: stored.localizedExtras.highlights.map((item, index) => ({
            value: item.value,
            label: pick(`extras.highlight.${index}.label`, item.label),
          })),
          services: stored.localizedExtras.services.map((item, index) => ({
            icon: item.icon,
            title: pick(`extras.service.${index}.title`, item.title),
            body: pick(`extras.service.${index}.body`, item.body),
          })),
        }
      : undefined,
  };
}

function collectTranslationJobs(stored: MobileAppConfigStored) {
  const jobs: Record<string, string> = {};
  queueText(jobs, "splash.tagline", stored.splash.tagline);
  queueText(jobs, "splash.loadingText", stored.splash.loadingText);
  queueText(jobs, "homeHeader.promoTitle", stored.homeHeader.promoTitle);
  queueText(jobs, "homeHeader.promoSubtitle", stored.homeHeader.promoSubtitle);
  queueText(jobs, "homeHeader.exploreLabel", stored.homeHeader.exploreLabel);
  queueText(
    jobs,
    "homeHeader.searchPlaceholder",
    stored.homeHeader.searchPlaceholder,
  );
  queueText(jobs, "footerCredit", stored.footerCredit);

  stored.onboarding.slides.forEach((slide, index) => {
    queueText(jobs, `onboarding.${index}.title`, slide.title);
    queueText(jobs, `onboarding.${index}.subtitle`, slide.subtitle);
  });

  stored.homeSections.forEach((section, index) => {
    if (section.title) queueText(jobs, `section.${index}.title`, section.title);
    if (section.subtitle) {
      queueText(jobs, `section.${index}.subtitle`, section.subtitle);
    }
    if (section.body) queueText(jobs, `section.${index}.body`, section.body);
    if (section.ctaLabel) {
      queueText(jobs, `section.${index}.ctaLabel`, section.ctaLabel);
    }
  });

  Object.assign(jobs, collectProfileMenuTranslationJobs(stored.profileMenus));

  stored.localizedExtras?.marqueeLines.forEach((line, index) => {
    queueText(jobs, `extras.marquee.${index}`, line);
  });
  stored.localizedExtras?.highlights.forEach((item, index) => {
    queueText(jobs, `extras.highlight.${index}.label`, item.label);
  });
  stored.localizedExtras?.services.forEach((item, index) => {
    queueText(jobs, `extras.service.${index}.title`, item.title);
    queueText(jobs, `extras.service.${index}.body`, item.body);
  });
  if (stored.localizedExtras?.brandName) {
    queueText(jobs, "extras.brandName", stored.localizedExtras.brandName);
  }

  return jobs;
}

export function syncMobileAppExtrasFromHome(
  stored: MobileAppConfigStored,
  site: CmsSiteSettings,
  home: CmsHome,
): MobileAppConfigStored {
  return {
    ...stored,
    localizedExtras: buildLocalizedExtrasFromHome(
      site,
      home,
      stored.localizedExtras,
    ),
  };
}

/** Admin save: normalize English input, auto-translate to Hindi & Gujarati. */
export async function localizeMobileAppOnSave(
  input: Partial<MobileAppConfig>,
  site: CmsSiteSettings,
  home: CmsHome,
  previous?: MobileAppConfigStored,
): Promise<MobileAppConfigStored> {
  const normalized = normalizeMobileAppConfig(input, site, home);
  const withPreviousExtras: MobileAppConfigStored = {
    ...normalized,
    localizedExtras: buildLocalizedExtrasFromHome(
      site,
      home,
      previous?.localizedExtras,
    ),
  };
  const jobs = collectTranslationJobs(withPreviousExtras);
  if (!Object.keys(jobs).length) {
    return withPreviousExtras;
  }
  const translations = await translateEnglishBatch(jobs);
  return applyTranslations(withPreviousExtras, translations);
}

export function flattenMobileAppForAdmin(
  stored: MobileAppConfigStored,
): MobileAppConfig {
  const resolved = resolveMobileAppConfig(stored, "en");
  return {
    ...resolved,
    profileMenus: flattenMobileProfileMenusForAdmin(stored.profileMenus),
  };
}

export function resolveMobileAppConfig(
  stored: MobileAppConfigStored,
  locale: AppLocale,
): MobileAppConfig {
  const pick = (text: LocalizedText | undefined) =>
    text ? pickLocalized(text, locale) : undefined;

  return {
    splash: {
      tagline: pick(stored.splash.tagline) ?? "",
      loadingText: pick(stored.splash.loadingText) ?? "",
      logoUrl: stored.splash.logoUrl,
      minDurationMs: stored.splash.minDurationMs,
    },
    onboarding: {
      enabled: stored.onboarding.enabled,
      slides: stored.onboarding.slides.map((slide) => ({
        id: slide.id,
        title: pick(slide.title) ?? "",
        subtitle: pick(slide.subtitle) ?? "",
        icon: slide.icon,
        image: slide.image,
        enabled: slide.enabled,
      })),
    },
    homeHeader: {
      promoTitle: pick(stored.homeHeader.promoTitle) ?? "",
      promoSubtitle: pick(stored.homeHeader.promoSubtitle) ?? "",
      exploreLabel: pick(stored.homeHeader.exploreLabel) ?? "",
      searchPlaceholder: pick(stored.homeHeader.searchPlaceholder) ?? "",
      showVisualSearch: stored.homeHeader.showVisualSearch,
    },
    homeSections: stored.homeSections.map((section) => ({
      id: section.id,
      type: section.type,
      enabled: section.enabled,
      title: pick(section.title),
      subtitle: pick(section.subtitle),
      image: section.image,
      body: pick(section.body),
      ctaLabel: pick(section.ctaLabel),
      ctaTarget: section.ctaTarget,
      endDate: section.endDate,
      backgroundColor: section.backgroundColor,
      accentColor: section.accentColor,
    })),
    profileMenus: resolveMobileProfileMenus(stored.profileMenus, locale),
    footerCredit: pick(stored.footerCredit) ?? "",
    support: { ...stored.support },
  };
}

export function buildMobileConfigResponse(
  mobileApp: MobileAppConfigStored,
  site: CmsSiteSettings,
  home: CmsHome,
  locale: AppLocale = "en",
): MobileAppPublicConfig {
  const resolved = resolveMobileAppConfig(mobileApp, locale);
  const extras =
    mobileApp.localizedExtras ?? buildLocalizedExtrasFromHome(site, home);

  return {
    ...resolved,
    brandName: pickLocalized(extras.brandName, locale) || site.brandName,
    logoUrl: mobileApp.splash.logoUrl || site.logoIcon || site.logo,
    marqueeLines: extras.marqueeLines.map((line) =>
      pickLocalized(line, locale),
    ),
    highlights: extras.highlights.map((item) => ({
      value: item.value,
      label: pickLocalized(item.label, locale),
    })),
    services: extras.services.map((item) => ({
      icon: item.icon,
      title: pickLocalized(item.title, locale),
      body: pickLocalized(item.body, locale),
    })),
    updatedAt: new Date().toISOString(),
    locale,
  };
}

function mobileAppBaseForLocalization(
  stored: MobileAppConfigStored,
  site: CmsSiteSettings,
  home: CmsHome,
): MobileAppConfigStored {
  return {
    ...stored,
    localizedExtras: buildLocalizedExtrasFromHome(
      site,
      home,
      stored.localizedExtras,
    ),
  };
}

/** Ensure legacy snapshots get Hindi/Gujarati without admin re-save. */
export async function ensureMobileAppLocalized(
  stored: MobileAppConfigStored,
  site: CmsSiteSettings,
  home: CmsHome,
): Promise<MobileAppConfigStored> {
  let current = mobileAppBaseForLocalization(stored, site, home);
  while (mobileAppHasPendingTranslations(current)) {
    const step = await ensureMobileAppLocalizedStep(current, site, home);
    current = step.mobileApp;
    if (!step.changed) break;
  }
  return current;
}

/** Bounded batch for admin translate-all steps. */
export async function ensureMobileAppLocalizedStep(
  stored: MobileAppConfigStored,
  site: CmsSiteSettings,
  home: CmsHome,
  maxKeys = 24,
): Promise<{ mobileApp: MobileAppConfigStored; changed: boolean }> {
  const base = mobileAppBaseForLocalization(stored, site, home);
  const allJobs = collectTranslationJobs(base);
  const keys = Object.keys(allJobs);
  if (!keys.length) {
    return { mobileApp: base, changed: false };
  }

  const batchKeys = keys.slice(0, maxKeys);
  const batch = Object.fromEntries(batchKeys.map((key) => [key, allJobs[key]]));
  const translations = await translateEnglishBatch(batch);
  const attempted = new Set(batchKeys);
  return {
    mobileApp: applyTranslations(base, translations, attempted),
    changed: true,
  };
}

export function mobileAppHasPendingTranslations(stored: MobileAppConfigStored) {
  return Object.keys(collectTranslationJobs(stored)).length > 0;
}
