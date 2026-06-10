/** Default image when bulk import / create has no `image_urls`. */
export const PRODUCT_PLACEHOLDER_IMAGE = "/sarjan-assets/sarjan-logo.svg";

export function isProductPlaceholderImage(url?: string | null): boolean {
  if (!url?.trim()) return true;
  const normalized = url.trim().toLowerCase();
  return (
    normalized.includes("sarjan-logo-icon") ||
    normalized.includes("sarjan-logo-full") ||
    normalized.includes("sarjan-logo.svg")
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
