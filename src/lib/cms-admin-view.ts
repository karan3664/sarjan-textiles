import type { CmsSnapshot } from "@/lib/cms-store";
import type { Product } from "@/data/mock";
import {
  flattenBlogForAdmin,
  flattenTestimonialForAdmin,
  resolveHomeForLocale,
} from "@/lib/content-localize";
import { flattenMobileAppForAdmin } from "@/lib/mobile-app-cms";
import {
  flattenCategoryHubForAdmin,
  flattenCollectionForAdmin,
  flattenProductFiltersForAdmin,
  flattenSeoPageForAdmin,
} from "@/lib/pages-localize";
import {
  flattenProductsForAdmin,
  type ProductRecord,
} from "@/lib/product-localize";

/** Return only the sections the admin client sent — avoids multi‑MB PUT responses. */
export function adminCmsPutResponse(
  next: CmsSnapshot,
  bodyKeys: string[],
): Partial<CmsSnapshot> {
  const flat = flattenCmsSnapshotForAdmin(next);
  const out: Partial<CmsSnapshot> = {};
  const keys = new Set(bodyKeys);

  if (keys.has("home")) out.home = flat.home;
  if (keys.has("mobileApp")) out.mobileApp = flat.mobileApp;
  if (keys.has("categoryHubPages")) {
    out.categoryHubPages = flat.categoryHubPages;
  }
  if (keys.has("collectionPages")) {
    out.collectionPages = flat.collectionPages;
  }
  if (keys.has("seoPages")) out.seoPages = flat.seoPages;
  if (keys.has("productFilters")) out.productFilters = flat.productFilters;
  if (keys.has("customSitePages")) {
    out.customSitePages = flat.customSitePages;
  }
  if (keys.has("siteSettings")) out.siteSettings = next.siteSettings;
  if (keys.has("pages")) out.pages = next.pages;
  if (keys.has("products")) out.products = flat.products;
  if (keys.has("blogs")) out.blogs = flat.blogs;
  if (keys.has("testimonials")) out.testimonials = flat.testimonials;

  return Object.keys(out).length ? out : flat;
}

/** English-only view for admin UI — localized `{en,hi,gu}` fields flattened. */
export function flattenCmsSnapshotForAdmin(cms: CmsSnapshot): CmsSnapshot {
  return {
    ...cms,
    home: resolveHomeForLocale(cms.home, "en"),
    products: flattenProductsForAdmin(cms.products as ProductRecord[]),
    blogs: cms.blogs.map((blog) => flattenBlogForAdmin(blog)),
    testimonials: cms.testimonials.map((item) =>
      flattenTestimonialForAdmin(item),
    ),
    categoryHubPages: (cms.categoryHubPages ?? []).map((hub) =>
      flattenCategoryHubForAdmin(hub),
    ),
    collectionPages: (cms.collectionPages ?? []).map((page) =>
      flattenCollectionForAdmin(page),
    ),
    productFilters: flattenProductFiltersForAdmin(cms.productFilters ?? []),
    seoPages: (cms.seoPages ?? []).map((page) => flattenSeoPageForAdmin(page)),
    mobileApp: flattenMobileAppForAdmin(
      cms.mobileApp,
    ) as unknown as CmsSnapshot["mobileApp"],
  };
}

export function asStoredProducts(products: ProductRecord[]): Product[] {
  return products as unknown as Product[];
}

export function asStoredBlogs<T>(blogs: T[]): CmsSnapshot["blogs"] {
  return blogs as unknown as CmsSnapshot["blogs"];
}

export function asStoredTestimonials<T>(
  testimonials: T[],
): CmsSnapshot["testimonials"] {
  return testimonials as unknown as CmsSnapshot["testimonials"];
}

export function asStoredCategoryHubs<T>(
  hubs: T[],
): CmsSnapshot["categoryHubPages"] {
  return hubs as unknown as CmsSnapshot["categoryHubPages"];
}

export function asStoredCollectionPages<T>(
  pages: T[],
): CmsSnapshot["collectionPages"] {
  return pages as unknown as CmsSnapshot["collectionPages"];
}

export function asStoredSeoPages<T>(pages: T[]): CmsSnapshot["seoPages"] {
  return pages as unknown as CmsSnapshot["seoPages"];
}

export function asStoredProductFilters<T>(
  filters: T[],
): CmsSnapshot["productFilters"] {
  return filters as unknown as CmsSnapshot["productFilters"];
}

export function asStoredHome<T>(home: T): CmsSnapshot["home"] {
  return home as unknown as CmsSnapshot["home"];
}
