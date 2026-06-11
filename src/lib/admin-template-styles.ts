/**
 * Modave admin vendor CSS lives under `public/template/admin/`.
 * Loaded via `<link>` in the root layout `<head>` (admin routes only) so Next.js
 * does not drop `@import url("/…")` during the CSS bundling step.
 */
export const ADMIN_TEMPLATE_STYLESHEETS = [
  "/template/admin/css/animate.min.css",
  "/template/admin/css/animation.css",
  "/template/admin/css/bootstrap.css",
  "/template/admin/css/bootstrap-select.min.css",
  "/template/admin/css/swiper-bundle.min.css",
  "/template/admin/css/styles.css",
  "/template/admin/font/fonts.css",
  "/template/admin/icon/icomoon/style.css",
  "/admin-charts.css",
  "/admin-supplements.css",
] as const;
