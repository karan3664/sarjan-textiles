/**
 * Storefront caching policy — Sprint 3.
 *
 * Catalog pages use short ISR so stock ribbons stay reasonably fresh.
 * CMS/marketing pages use longer TTL. Session/cart/checkout stay dynamic.
 */

/** Product grids, home featured, search — stock + deals. */
export const CATALOG_PAGE_REVALIDATE_SECONDS = 60;

/** Blogs, categories, collections, CMS landing pages. */
export const CONTENT_PAGE_REVALIDATE_SECONDS = 300;

/** Sitemap XML — SEO crawl budget. */
export const SITEMAP_REVALIDATE_SECONDS = 3600;

/** Anonymous catalog API responses (CDN). */
export const CATALOG_API_S_MAXAGE_SECONDS = 60;
export const CATALOG_API_STALE_WHILE_REVALIDATE_SECONDS = 300;

/** Navigation + account menu JSON (CDN). */
export const NAV_API_S_MAXAGE_SECONDS = 300;
export const NAV_API_STALE_WHILE_REVALIDATE_SECONDS = 600;

export function catalogApiCacheControl(privateSession: boolean): string {
  if (privateSession) {
    return "private, no-store";
  }
  return `public, s-maxage=${CATALOG_API_S_MAXAGE_SECONDS}, stale-while-revalidate=${CATALOG_API_STALE_WHILE_REVALIDATE_SECONDS}`;
}

export function navApiCacheControl(): string {
  return `public, s-maxage=${NAV_API_S_MAXAGE_SECONDS}, stale-while-revalidate=${NAV_API_STALE_WHILE_REVALIDATE_SECONDS}`;
}
