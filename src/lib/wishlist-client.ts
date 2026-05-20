export const WISHLIST_KEY = "sarjan-wishlist";

export function readWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(WISHLIST_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed.filter(
          (item): item is string => typeof item === "string" && item.length > 0,
        ),
      ),
    );
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

/** Sync heart button styles with localStorage (for dynamically mounted buttons). */
export function syncWishlistButtonStates() {
  if (typeof window === "undefined") return;
  const wishlisted = new Set(readWishlist());
  document
    .querySelectorAll<HTMLElement>("[data-wishlist-toggle][data-product-slug]")
    .forEach((node) => {
      const active = wishlisted.has(node.dataset.productSlug ?? "");
      node.classList.toggle("active", active);
      node.classList.toggle("added", active);
      node.setAttribute("aria-pressed", String(active));
    });
  document.querySelectorAll(".wishlist-count").forEach((node) => {
    node.textContent = String(wishlisted.size);
  });
}
