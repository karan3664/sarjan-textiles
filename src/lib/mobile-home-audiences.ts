import {
  coerceLocalized,
  needsTranslation,
  pickLocalized,
  type AppLocale,
  type LocalizedText,
} from "@/lib/localized-text";

export type MobileHomeAudienceTab = {
  id: string;
  label: string;
  enabled: boolean;
  searchPlaceholder?: string;
  /** Comma-separated in admin; used to match product/category names (ignored for `all`). */
  keywords?: string[];
  order: number;
};

type StoredHomeAudienceTab = Omit<
  MobileHomeAudienceTab,
  "label" | "searchPlaceholder"
> & {
  label: LocalizedText;
  searchPlaceholder?: LocalizedText;
};

export const BUILTIN_AUDIENCE_KEYWORDS: Record<string, string[]> = {
  men: [
    "men",
    "mens",
    "men's",
    "shirt",
    "kurta",
    "sherwani",
    "blazer",
    "nehru",
    "jacket",
    "trouser",
    "pant",
    "waistcoat",
    "indo-western",
  ],
  women: [
    "women",
    "womens",
    "women's",
    "saree",
    "sari",
    "kurti",
    "lehenga",
    "dupatta",
    "salwar",
    "anarkali",
    "gown",
    "dress",
    "blouse",
    "fusion",
  ],
  kids: [
    "kid",
    "kids",
    "child",
    "children",
    "infant",
    "baby",
    "boy",
    "girl",
    "junior",
  ],
};

function slugAudienceId(raw: string) {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return slug || "tab";
}

function toStoredTab(
  tab: Partial<MobileHomeAudienceTab> & { id?: string },
  index: number,
): StoredHomeAudienceTab | null {
  const id = slugAudienceId(String(tab.id ?? ""));
  if (!id) return null;
  const label =
    typeof tab.label === "string" && tab.label.trim()
      ? tab.label.trim()
      : id === "all"
        ? "All"
        : id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const searchPlaceholder =
    typeof tab.searchPlaceholder === "string" && tab.searchPlaceholder.trim()
      ? tab.searchPlaceholder.trim()
      : id === "all"
        ? "Search wholesale collections"
        : `Search ${label.toLowerCase()} collections`;

  const keywords = Array.isArray(tab.keywords)
    ? tab.keywords
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean)
    : id !== "all"
      ? [...(BUILTIN_AUDIENCE_KEYWORDS[id] ?? [])]
      : undefined;

  return {
    id,
    label: coerceLocalized(label),
    enabled: tab.enabled !== false,
    searchPlaceholder: coerceLocalized(searchPlaceholder),
    keywords: id === "all" ? undefined : keywords,
    order: Number.isFinite(tab.order) ? Number(tab.order) : index,
  };
}

function defaultStoredHomeAudiences(): StoredHomeAudienceTab[] {
  return defaultHomeAudiences()
    .map((tab, index) => toStoredTab(tab, index))
    .filter((tab): tab is StoredHomeAudienceTab => tab != null)
    .map((tab, index) => ({ ...tab, order: index }));
}

export function defaultHomeAudiences(): MobileHomeAudienceTab[] {
  return [
    {
      id: "all",
      label: "All",
      enabled: true,
      searchPlaceholder: "Search wholesale collections",
      order: 0,
    },
    {
      id: "men",
      label: "Men",
      enabled: true,
      searchPlaceholder: "Search shirts, kurtas & menswear",
      keywords: [...BUILTIN_AUDIENCE_KEYWORDS.men],
      order: 1,
    },
    {
      id: "women",
      label: "Women",
      enabled: true,
      searchPlaceholder: "Search sarees, kurtis & fusion",
      keywords: [...BUILTIN_AUDIENCE_KEYWORDS.women],
      order: 2,
    },
  ];
}

export function normalizeHomeAudiences(
  input: Array<Partial<MobileHomeAudienceTab>> | undefined,
): StoredHomeAudienceTab[] {
  if (!Array.isArray(input) || !input.length) {
    return defaultStoredHomeAudiences();
  }

  const seen = new Set<string>();
  const normalized: StoredHomeAudienceTab[] = [];

  for (const [index, tab] of input.entries()) {
    const stored = toStoredTab(tab, index);
    if (!stored || seen.has(stored.id)) continue;
    seen.add(stored.id);
    normalized.push(stored);
  }

  if (!normalized.some((tab) => tab.id === "all")) {
    const allTab = toStoredTab(defaultHomeAudiences()[0], 0);
    if (allTab) normalized.unshift(allTab);
  }

  return normalized
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((tab, index) => ({ ...tab, order: index }));
}

export function resolveHomeAudiences(
  stored: StoredHomeAudienceTab[] | undefined,
  locale: AppLocale,
): MobileHomeAudienceTab[] {
  const normalized = stored?.length
    ? stored
    : normalizeHomeAudiences(undefined);

  return normalized
    .map((tab) => ({
      id: tab.id,
      label: pickLocalized(tab.label, locale) || tab.label.en || tab.id,
      enabled: tab.enabled,
      searchPlaceholder: tab.searchPlaceholder
        ? pickLocalized(tab.searchPlaceholder, locale)
        : undefined,
      keywords: tab.keywords,
      order: tab.order,
    }))
    .filter((tab) => tab.enabled)
    .sort((a, b) => a.order - b.order);
}

export function flattenHomeAudiencesForAdmin(
  stored: StoredHomeAudienceTab[] | undefined,
): MobileHomeAudienceTab[] {
  return resolveHomeAudiences(stored, "en");
}

export function collectHomeAudienceTranslationJobs(
  stored: StoredHomeAudienceTab[] | undefined,
) {
  const jobs: Record<string, string> = {};
  for (const [index, tab] of (stored ?? []).entries()) {
    if (needsTranslation(tab.label)) {
      jobs[`homeAudience.${index}.label`] = tab.label.en;
    }
    if (tab.searchPlaceholder && needsTranslation(tab.searchPlaceholder)) {
      jobs[`homeAudience.${index}.searchPlaceholder`] =
        tab.searchPlaceholder.en;
    }
  }
  return jobs;
}

export function applyHomeAudienceTranslations(
  stored: StoredHomeAudienceTab[],
  translations: Record<string, { hi: string; gu: string }>,
): StoredHomeAudienceTab[] {
  const pick = (key: string, text: LocalizedText) => {
    const translated = translations[key];
    if (!translated) return text;
    return {
      en: text.en,
      hi: translated.hi || text.hi || text.en,
      gu: translated.gu || text.gu || text.en,
    };
  };

  return stored.map((tab, index) => ({
    ...tab,
    label: pick(`homeAudience.${index}.label`, tab.label),
    searchPlaceholder: tab.searchPlaceholder
      ? pick(`homeAudience.${index}.searchPlaceholder`, tab.searchPlaceholder)
      : undefined,
  }));
}

export function keywordsForAudienceTab(tab: MobileHomeAudienceTab): string[] {
  if (tab.id === "all") return [];
  if (tab.keywords?.length) return tab.keywords;
  return BUILTIN_AUDIENCE_KEYWORDS[tab.id] ?? [];
}

export type { StoredHomeAudienceTab };
