import { notFound } from "next/navigation";
import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { resolveCustomSitePage } from "@/lib/pages-localize";
import { localeFromHeaders } from "@/lib/server-locale";

/** Static app routes — custom CMS slugs must not collide with these. */
export const RESERVED_CUSTOM_SITE_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "about",
  "blog",
  "cart",
  "categories",
  "checkout",
  "collections",
  "contact",
  "compare-products",
  "certifications",
  "customer-feedback",
  "download",
  "download-admin",
  "faqs",
  "forgot-password",
  "forget-password",
  "inquiry",
  "infrastructure",
  "launch",
  "login",
  "my-account",
  "my-account-address",
  "my-account-orders",
  "my-account-orders-details",
  "my-account-testimonials",
  "newsletter",
  "order-feedback",
  "order-tracking",
  "payment-confirmation",
  "payment-failure",
  "privacy-policy",
  "process",
  "product-out-of-stock",
  "products",
  "profile",
  "refund-policy",
  "register",
  "registration-thank-you",
  "search-result",
  "shipping-policy",
  "shopping-cart",
  "site",
  "site-map",
  "term-of-use",
  "terms",
  "uploads",
  "wishlist",
]);

export function customSitePagePath(slug: string): string {
  return `/${slug.replace(/^\/+/, "")}`;
}

export function legacyCustomSitePagePath(slug: string): string {
  return `/site/${slug.replace(/^\/+/, "")}`;
}

export async function loadCustomSitePage(slug: string) {
  if (!slug || RESERVED_CUSTOM_SITE_SLUGS.has(slug.toLowerCase())) {
    notFound();
  }
  const locale = await localeFromHeaders();
  const cms = await getLocalizedCmsSnapshot();
  const pageRaw =
    cms.customSitePages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null;
  if (!pageRaw) {
    notFound();
  }
  return {
    page: resolveCustomSitePage(pageRaw, locale),
    products: cms.products,
  };
}
