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

/** Drop slugs that no longer exist in the catalog (e.g. after CMS dedupe). */
export async function resolveWishlistSlugs(slugs: string[]) {
  if (!slugs.length) return [];
  try {
    const res = await fetch(
      `/api/catalog/products?ids=${encodeURIComponent(slugs.join(","))}&limit=${slugs.length}`,
    );
    const data = (await res.json()) as { items?: Array<{ slug: string }> };
    const valid = new Set((data.items ?? []).map((item) => item.slug));
    return slugs.filter((slug) => valid.has(slug));
  } catch {
    return slugs;
  }
}

/** Prune localStorage wishlist to catalog-backed slugs; returns valid list. */
export async function refreshWishlistFromCatalog() {
  const current = readWishlist();
  const valid = await resolveWishlistSlugs(current);
  if (
    valid.length !== current.length ||
    valid.some((slug, index) => slug !== current[index])
  ) {
    writeWishlist(valid);
  }
  return valid;
}

export function setWishlistCountBadge(count: number) {
  if (typeof window === "undefined") return;
  document.querySelectorAll(".wishlist-count").forEach((node) => {
    node.textContent = String(count);
  });
}

/** Sync heart button styles with localStorage (for dynamically mounted buttons). */
export function syncWishlistButtonStates(count = readWishlist().length) {
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
  setWishlistCountBadge(count);
}
