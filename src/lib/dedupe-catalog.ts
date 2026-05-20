/** Normalize catalog labels for duplicate detection. */
export function normalizeCatalogLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

type NamedItem = { name?: string; slug?: string };
type TitledItem = { title?: string; slug?: string };

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
