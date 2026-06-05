import type { LocalizedText } from "@/lib/localized-text";

type CatalogLabel = string | LocalizedText | undefined | null;

function catalogLabelText(value: CatalogLabel): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.en ?? value.hi ?? value.gu ?? "").trim();
}

/** Normalize catalog labels for duplicate detection. */
export function normalizeCatalogLabel(value: CatalogLabel) {
  return catalogLabelText(value).toLowerCase().replace(/\s+/g, " ");
}

type NamedItem = { name?: CatalogLabel; slug?: string };
type TitledItem = { title?: CatalogLabel; slug?: string };

/**
 * Keep the first item per slug and per display name (case-insensitive).
 */
export function dedupeProductsByName<T extends NamedItem>(items: T[]): T[] {
  const seenSlugs = new Set<string>();
  const seenNames = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const slug = (item.slug ?? "").trim().toLowerCase();
    const name = normalizeCatalogLabel(item.name ?? "");

    if (slug && seenSlugs.has(slug)) continue;
    if (name && seenNames.has(name)) continue;

    if (slug) seenSlugs.add(slug);
    if (name) seenNames.add(name);
    result.push(item);
  }

  return result;
}

/** Keep the first blog per slug and per title. */
export function dedupeBlogsByTitle<T extends TitledItem>(items: T[]): T[] {
  const seenSlugs = new Set<string>();
  const seenTitles = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const slug = (item.slug ?? "").trim().toLowerCase();
    const title = normalizeCatalogLabel(item.title ?? "");

    if (slug && seenSlugs.has(slug)) continue;
    if (title && seenTitles.has(title)) continue;

    if (slug) seenSlugs.add(slug);
    if (title) seenTitles.add(title);
    result.push(item);
  }

  return result;
}

/** Keep the first testimonial per id and per customer name. */
export function dedupeTestimonialsByName<
  T extends { id?: string; name?: string },
>(items: T[]): T[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const id = (item.id ?? "").trim();
    const name = normalizeCatalogLabel(item.name ?? "");

    if (id && seenIds.has(id)) continue;
    if (name && seenNames.has(name)) continue;

    if (id) seenIds.add(id);
    if (name) seenNames.add(name);
    result.push(item);
  }

  return result;
}
