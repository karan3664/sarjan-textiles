export const APP_LOCALES = ["en", "hi", "gu"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export type LocalizedText = {
  en: string;
  hi: string;
  gu: string;
};

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value);
}

export function parseRequestLocale(
  acceptLanguage?: string | null,
  queryLang?: string | null,
): AppLocale {
  const query = queryLang?.trim().toLowerCase();
  if (query && isAppLocale(query)) return query;

  const header = acceptLanguage
    ?.split(",")[0]
    ?.trim()
    .slice(0, 2)
    .toLowerCase();
  if (header && isAppLocale(header)) return header;

  return "en";
}

export function pickLocalized(
  value: string | LocalizedText | undefined | null,
  locale: AppLocale,
): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return (
    value[locale]?.trim() ||
    value.en?.trim() ||
    value.hi?.trim() ||
    value.gu?.trim() ||
    ""
  );
}

export function coerceLocalized(
  value: string | Partial<LocalizedText> | undefined | null,
): LocalizedText {
  if (!value) return { en: "", hi: "", gu: "" };
  if (typeof value === "string") {
    const en = value.trim();
    return { en, hi: en, gu: en };
  }
  const en = String(value.en ?? "").trim();
  const hi = String(value.hi ?? en).trim();
  const gu = String(value.gu ?? en).trim();
  return { en, hi, gu };
}

export function localizedFromEnglish(
  en: string,
  hi: string,
  gu: string,
): LocalizedText {
  const english = en.trim();
  return {
    en: english,
    hi: hi.trim() || english,
    gu: gu.trim() || english,
  };
}

export function needsTranslation(text: LocalizedText): boolean {
  const en = text.en.trim();
  if (!en) return false;
  const hi = text.hi.trim();
  const gu = text.gu.trim();
  if (!hi || !gu) return true;
  if (hi === en && gu === en) return true;
  return false;
}

export function mergeTranslation(
  current: LocalizedText,
  hi: string,
  gu: string,
): LocalizedText {
  return localizedFromEnglish(current.en, hi, gu);
}
