import { translateEnglishBatch } from "@/lib/auto-translate";
import {
  coerceLocalized,
  mergeTranslation,
  needsTranslation,
  type LocalizedText,
} from "@/lib/localized-text";

export function readEnglish(
  value: string | LocalizedText | undefined | null,
): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return value.en.trim();
}

export function toLocalizedField(
  value: string | LocalizedText | undefined | null,
): LocalizedText | undefined {
  if (value == null || value === "") return undefined;
  return coerceLocalized(value);
}

export function toLocalizedList(
  values: Array<string | LocalizedText> | undefined,
): LocalizedText[] {
  return (values ?? []).map((value) => coerceLocalized(value));
}

export async function applyTranslationJobs(
  fields: Record<string, LocalizedText>,
): Promise<Record<string, LocalizedText>> {
  const jobs: Record<string, string> = {};
  for (const [key, text] of Object.entries(fields)) {
    if (needsTranslation(text)) {
      jobs[key] = text.en;
    }
  }
  if (!Object.keys(jobs).length) return fields;

  const translations = await translateEnglishBatch(jobs);
  const next = { ...fields };
  for (const [key, text] of Object.entries(fields)) {
    const translated = translations[key];
    if (translated) {
      next[key] = mergeTranslation(text, translated.hi, translated.gu);
    }
  }
  return next;
}

export function hasPendingTranslations(
  fields: Record<string, LocalizedText>,
): boolean {
  return Object.values(fields).some((text) => needsTranslation(text));
}
