import type { BotCategoryEntry } from "@/lib/order-bot/catalog-tools";
import {
  resolveCategoryQuery,
  resolveCollectionQuery,
} from "@/lib/order-bot/catalog-tools";
import { slugifyCmsSegment } from "@/lib/slug";

const BROWSE_FILLERS =
  /\b(product|products|producto|show|karo|kro|dikhao|dikha|dikhe|dekhao|dekho|batao|bata|list|browse|me|men|main|mai|mein|in|ke|ki|ka|ko|please|pls|kripya|sarjan|textiles|some|kuch|mujhe|mujhko|chahiye|hai|ho|the|a|an|all|sab|sabhi|only|sirf|wale|wali|vale)\b/gi;

/** User wants to see products by category/collection (Hindi, English, Hinglish). */
export function isBrowseIntent(text: string) {
  const t = text.trim().toLowerCase();
  if (!t || t.length < 2) return false;
  if (/^categories?$/.test(t)) return true;

  return (
    /\b(show|dikhao|dikha|dekhao|dekho|batao|list|browse)\b/.test(t) ||
    /\bproducts?\s+(show|dikhao|dekhao|karo|in|me|mai|mein|ke)\b/.test(t) ||
    /\b(show|dikhao|dekhao|karo)\s+\w/.test(t) ||
    /\b(in|me|mai|mein)\s+\w+/.test(t) ||
    /\w+\s+(me|mai|mein)\s+products?\b/.test(t) ||
    (/\b(kurta|kurtas|shirt|shirts|ajrak|ajrakh|saree|collection)\b/.test(t) &&
      /\b(dikhao|show|dekho|karo|products?|list)\b/.test(t))
  );
}

/** Pull category/collection keyword from messy user text. */
export function extractBrowseSubject(text: string): string {
  let t = text.trim();

  const patterns: RegExp[] = [
    /products?\s+show\s+karo\s+(.+?)(?:\s+me|\s+mai|\s+mein)?$/i,
    /product\s+show\s+karo\s+(.+?)(?:\s+me|\s+mai|\s+mein)?$/i,
    /(?:show|dikhao|dekhao|dekho|batao)\s+karo\s+(.+?)(?:\s+me|\s+mai|\s+mein)?$/i,
    /(?:show|dikhao|dekhao|dekho|batao)\s+(.+?)(?:\s+me|\s+mai|\s+mein)?$/i,
    /products?\s+(?:in|me|mai|mein|ke)\s+(.+)$/i,
    /(.+?)\s+(?:me|mai|mein)\s+products?/i,
    /products?\s+in\s+(.+)$/i,
    /^(?:show|browse|list)\s+(.+)$/i,
    /(.+?)\s+(?:collection|category|products?)$/i,
    /(.+?)\s+ke\s+products?/i,
    /(.+?)\s+wali\s+products?/i,
  ];

  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match?.[1]?.trim()) {
      t = match[1].trim();
      break;
    }
  }

  t = t.replace(BROWSE_FILLERS, " ").replace(/\s+/g, " ").trim();

  return t.length >= 2 ? t : text.trim();
}

function slugValue(value: string) {
  return slugifyCmsSegment(value);
}

/** Best category/collection/search term for catalog browse. */
export function resolveCatalogSearchTerm(
  text: string,
  categories: BotCategoryEntry[],
): string {
  const subject = extractBrowseSubject(text);
  const candidates = [
    subject,
    text.trim(),
    ...subject.split(/\s+/).filter((part) => part.length >= 3),
    ...text.split(/\s+/).filter((part) => part.length >= 4),
  ];

  for (const candidate of candidates) {
    const collection = resolveCollectionQuery(candidate);
    if (collection)
      return collection.title.replace(/\s+collection$/i, "").trim();

    const category = resolveCategoryQuery(candidate, categories);
    if (category) return category.name;

    const lower = candidate.toLowerCase();
    const loose = categories.find((item) => {
      const name = item.name.toLowerCase();
      const slug = item.slug.toLowerCase();
      if (name.includes(lower) || lower.includes(slug)) return true;
      const stem = lower.replace(/s$/i, "");
      if (stem.length >= 3 && (name.includes(stem) || slug.includes(stem))) {
        return true;
      }
      return false;
    });
    if (loose) return loose.name;
  }

  return subject;
}

export function shouldBrowseCatalog(
  text: string,
  categories: BotCategoryEntry[],
): boolean {
  if (isBrowseIntent(text)) return true;
  const term = extractBrowseSubject(text);
  if (term.length < 2) return false;
  if (resolveCollectionQuery(term) || resolveCollectionQuery(text)) return true;
  if (resolveCategoryQuery(term, categories)) return true;
  return categories.some((item) => {
    const lower = term.toLowerCase();
    return (
      item.name.toLowerCase().includes(lower) ||
      slugValue(item.name).includes(slugValue(term))
    );
  });
}
