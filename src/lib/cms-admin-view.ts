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
