export const WISHLIST_KEY = "sarjan-wishlist";

export function readWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((item): item is string => typeof item === "string" && item.length > 0)));
  } catch {
    return [];
  }
}

export function writeWishlist(slugs: string[]) {
  if (typeof window === "undefined") return;
  const next = Array.from(new Set(slugs.filter(Boolean)));
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("sarjan-wishlist-updated"));
}

export function isWishlisted(slug: string) {
  return readWishlist().includes(slug);
}

export function toggleWishlist(slug: string) {
  const current = readWishlist();
  const next = current.includes(slug)
    ? current.filter((item) => item !== slug)
    : [...current, slug];
  writeWishlist(next);
  return next.includes(slug);
}
