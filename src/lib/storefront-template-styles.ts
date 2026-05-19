/**
 * Modave / storefront vendor CSS lives under `public/template/storefront/`.
 * Loaded via `<link>` in the root layout so Next.js does not drop `@import url("/…")`
 * during the CSS bundling step (which can leave the storefront unstyled).
 */
export const STOREFRONT_TEMPLATE_STYLESHEETS = [
  "/template/storefront/fonts/fonts.css",
  "/template/storefront/fonts/font-icons.css",
  "/template/storefront/css/bootstrap.min.css",
  "/template/storefront/css/swiper-bundle.min.css",
  "/template/storefront/css/bootstrap-select.min.css",
  "/template/storefront/css/photoswipe.css",
  "/template/storefront/css/drift-basic.min.css",
  "/template/storefront/css/animate.css",
  "/template/storefront/css/styles.css",
] as const;
