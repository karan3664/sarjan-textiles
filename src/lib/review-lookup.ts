/** Canonical slug for review storage and lookup (case-insensitive). */
export function normalizeReviewProductSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Match ST- prefixed and numeric order ids for the same order. */
export function orderIdsEquivalent(requested: string, stored: string): boolean {
  const a = requested.trim().toLowerCase();
  const b = stored.trim().toLowerCase();
  if (!a || !b) {
    return false;
  }
  const aNum = a.replace(/^st-/, "");
  const bNum = b.replace(/^st-/, "");
  return a === b || aNum === b || a === bNum || aNum === bNum;
}
