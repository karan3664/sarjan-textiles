/** Bump when public/*.css changes so browsers skip stale service-worker cache. */
export const STOREFRONT_STATIC_CSS_VERSION = "20260611a";

export function storefrontStaticCss(href: string): string {
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}v=${STOREFRONT_STATIC_CSS_VERSION}`;
}
