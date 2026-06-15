/** Default image when bulk import / create has no `image_urls`. */
export const PRODUCT_PLACEHOLDER_IMAGE = "/sarjan-assets/sarjan-logo-full.png";

export function isProductPlaceholderImage(url?: string | null): boolean {
  if (!url?.trim()) return true;
  const normalized = url.trim().toLowerCase();
  return (
    normalized.includes("sarjan-logo-icon") ||
    normalized.includes("sarjan-logo-full") ||
    normalized.includes("sarjan-logo-placeholder") ||
    normalized.includes("sarjan-logo.svg") ||
    normalized.includes("logo final")
  );
}

export function productHasRealImages(images?: string[] | null): boolean {
  return Boolean(images?.some((img) => !isProductPlaceholderImage(img)));
}

/** PDP / gallery: only real product photos — never duplicate logo slides from other SKUs. */
export function productGalleryImages(images?: string[] | null): string[] {
  const unique = [...new Set((images ?? []).filter(Boolean))];
  if (!productHasRealImages(unique)) {
    return [PRODUCT_PLACEHOLDER_IMAGE];
  }
  return unique;
}

/**
 * One gallery slide per color index — keeps images[i] aligned with colors[i]
 * (do not dedupe; duplicate URLs are valid when several colors share one photo).
 */
export function productColorGalleryImages(
  images?: string[] | null,
  colorCount = 0,
): string[] {
  const list = (images ?? []).filter(Boolean);
  if (!productHasRealImages(list)) {
    return [PRODUCT_PLACEHOLDER_IMAGE];
  }
  const slots = Math.max(colorCount, list.length);
  if (!slots) return list.length ? list : [PRODUCT_PLACEHOLDER_IMAGE];

  return Array.from({ length: slots }, (_, index) => {
    return list[index] ?? list[0] ?? PRODUCT_PLACEHOLDER_IMAGE;
  });
}

export function productImageClassName(url?: string | null, extra = ""): string {
  const classes = extra.trim();
  if (!isProductPlaceholderImage(url)) return classes;
  return classes
    ? `${classes} sarjan-product-img-placeholder`
    : "sarjan-product-img-placeholder";
}

/** Cart / checkout thumb wrappers — square frame so logo placeholders are not cropped. */
export function productImageThumbWrapClassName(
  url?: string | null,
  extra = "",
): string {
  const classes = extra.trim();
  if (!isProductPlaceholderImage(url)) return classes;
  return classes
    ? `${classes} sarjan-product-thumb--placeholder`
    : "sarjan-product-thumb--placeholder";
}
