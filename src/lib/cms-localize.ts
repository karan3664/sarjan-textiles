import { translateEnglishBatch } from "@/lib/auto-translate";
import {
  coerceLocalized,
  markTranslationAttempted,
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
  const stepped = await applyTranslationJobsStep(
    fields,
    Number.POSITIVE_INFINITY,
  );
  return stepped.fields;
}

/** Translate up to `maxKeys` pending fields — keeps admin bulk runs under server timeouts. */
export async function applyTranslationJobsStep(
  fields: Record<string, LocalizedText>,
  maxKeys: number,
): Promise<{ fields: Record<string, LocalizedText>; hasMore: boolean }> {
  const jobs: Record<string, string> = {};
  for (const [key, text] of Object.entries(fields)) {
    if (needsTranslation(text)) {
      if (Object.keys(jobs).length < maxKeys) {
        jobs[key] = text.en;
      }
    }
  }
  if (!Object.keys(jobs).length) {
    return { fields, hasMore: false };
  }

  const translations = await translateEnglishBatch(jobs);
  const next = { ...fields };
  for (const key of Object.keys(jobs)) {
    const text = fields[key];
    if (!text) continue;
    const translated = translations[key];
    next[key] = translated
      ? mergeTranslation(text, translated.hi, translated.gu)
      : markTranslationAttempted(text);
  }

  const hasMore = Object.values(next).some((text) => needsTranslation(text));
  return { fields: next, hasMore };
}

export function hasPendingTranslations(
  fields: Record<string, LocalizedText>,
): boolean {
  return Object.values(fields).some((text) => needsTranslation(text));
}
