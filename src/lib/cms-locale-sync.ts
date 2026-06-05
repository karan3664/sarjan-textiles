import {
  categoryHubsNeedLocalization,
  collectionsNeedLocalization,
  customSitePagesNeedLocalization,
  ensureCategoryHubsLocalized,
  ensureCollectionsLocalized,
  ensureCustomSitePagesLocalized,
  ensureProductFiltersLocalized,
  ensureSeoPagesLocalized,
  productFiltersNeedLocalization,
  seoPagesNeedLocalization,
} from "@/lib/pages-localize";
import type { CmsSnapshot } from "@/lib/cms-store";
import { getCmsSnapshot } from "@/lib/cms-store";
import {
  blogsNeedLocalization,
  ensureBlogsLocalized,
  ensureHomeLocalized,
  ensureTestimonialsLocalized,
  homeNeedsLocalization,
  testimonialsNeedLocalization,
} from "@/lib/content-localize";
import {
  asStoredBlogs,
  asStoredCategoryHubs,
  asStoredCollectionPages,
  asStoredHome,
  asStoredProductFilters,
  asStoredProducts,
  asStoredSeoPages,
  asStoredTestimonials,
} from "@/lib/cms-admin-view";
import {
  ensureProductsLocalized,
  productsNeedLocalization,
} from "@/lib/product-localize";
import {
  ensureMobileAppLocalized,
  mobileAppHasPendingTranslations,
} from "@/lib/mobile-app-cms";

export type CmsLocalizationSection =
  | "products"
  | "home"
  | "blogs"
  | "testimonials"
  | "categoryHubPages"
  | "collectionPages"
  | "productFilters"
  | "customSitePages"
  | "seoPages"
  | "mobileApp";

export type CmsLocalizationStatus = {
  pending: boolean;
  sections: Record<CmsLocalizationSection, boolean>;
  pendingSections: CmsLocalizationSection[];
  labels: Record<CmsLocalizationSection, string>;
};

const SECTION_LABELS: Record<CmsLocalizationSection, string> = {
  products: "Products",
  home: "Home page",
  blogs: "Blogs",
  testimonials: "Testimonials",
  categoryHubPages: "Category pages",
  collectionPages: "Collection pages",
  productFilters: "Product filters",
  customSitePages: "Custom site pages",
  seoPages: "SEO pages",
  mobileApp: "Mobile app CMS",
};

export function getCmsLocalizationStatus(
  cms: CmsSnapshot,
): CmsLocalizationStatus {
  const sections: Record<CmsLocalizationSection, boolean> = {
    products: productsNeedLocalization(cms.products ?? []),
    home: homeNeedsLocalization(cms.home),
    blogs: blogsNeedLocalization(cms.blogs ?? []),
    testimonials: testimonialsNeedLocalization(cms.testimonials ?? []),
    categoryHubPages: categoryHubsNeedLocalization(cms.categoryHubPages ?? []),
    collectionPages: collectionsNeedLocalization(cms.collectionPages ?? []),
    productFilters: productFiltersNeedLocalization(cms.productFilters ?? []),
    customSitePages: customSitePagesNeedLocalization(cms.customSitePages ?? []),
    seoPages:
      Array.isArray(cms.seoPages) && cms.seoPages.length
        ? seoPagesNeedLocalization(cms.seoPages)
        : false,
    mobileApp: mobileAppHasPendingTranslations(cms.mobileApp),
  };
  const pendingSections = (
    Object.entries(sections) as Array<[CmsLocalizationSection, boolean]>
  )
    .filter(([, pending]) => pending)
    .map(([key]) => key);

  return {
    pending: pendingSections.length > 0,
    sections,
    pendingSections,
    labels: SECTION_LABELS,
  };
}

export async function ensureCmsLocalized(
  cms: CmsSnapshot,
): Promise<{ cms: CmsSnapshot; changed: boolean }> {
  let changed = false;
  let products = cms.products;
  let home = cms.home;
  let blogs = cms.blogs;
  let testimonials = cms.testimonials;
  let mobileApp = cms.mobileApp;
  let categoryHubPages = cms.categoryHubPages;
  let collectionPages = cms.collectionPages;
  let productFilters = cms.productFilters;
  let customSitePages = cms.customSitePages;
  let seoPages = cms.seoPages;

  if (productsNeedLocalization(products)) {
    products = asStoredProducts(await ensureProductsLocalized(products));
    changed = true;
  }
  if (homeNeedsLocalization(home)) {
    home = asStoredHome(await ensureHomeLocalized(home));
    changed = true;
  }
  if (blogsNeedLocalization(blogs)) {
    blogs = asStoredBlogs(await ensureBlogsLocalized(blogs));
    changed = true;
  }
  if (testimonialsNeedLocalization(testimonials)) {
    testimonials = asStoredTestimonials(
      await ensureTestimonialsLocalized(testimonials),
    );
    changed = true;
  }
  if (categoryHubsNeedLocalization(categoryHubPages)) {
    categoryHubPages = asStoredCategoryHubs(
      await ensureCategoryHubsLocalized(categoryHubPages),
    );
    changed = true;
  }
  if (collectionsNeedLocalization(collectionPages ?? [])) {
    collectionPages = asStoredCollectionPages(
      await ensureCollectionsLocalized(collectionPages ?? []),
    );
    changed = true;
  }
  if (productFiltersNeedLocalization(productFilters)) {
    productFilters = asStoredProductFilters(
      await ensureProductFiltersLocalized(productFilters),
    );
    changed = true;
  }
  if (customSitePagesNeedLocalization(customSitePages ?? [])) {
    customSitePages = await ensureCustomSitePagesLocalized(
      customSitePages ?? [],
    );
    changed = true;
  }
  if (
    Array.isArray(seoPages) &&
    seoPages.length &&
    seoPagesNeedLocalization(seoPages)
  ) {
    seoPages = asStoredSeoPages(await ensureSeoPagesLocalized(seoPages));
    changed = true;
  }
  if (mobileAppHasPendingTranslations(mobileApp)) {
    mobileApp = await ensureMobileAppLocalized(
      mobileApp,
      cms.siteSettings,
      home,
    );
    changed = true;
  }

  if (!changed) {
    return { cms, changed: false };
  }

  return {
    cms: {
      ...cms,
      products,
      home,
      blogs,
      testimonials,
      mobileApp,
      categoryHubPages,
      collectionPages,
      productFilters,
      customSitePages,
      seoPages,
    },
    changed: true,
  };
}

/**
 * Public storefront read — fast path only.
 * hi/gu are resolved at render time via pickLocalized (falls back to English).
 * Bulk backfill runs from admin "Translate all now" (ensureCmsLocalized), not on every page view.
 */
export async function getLocalizedCmsSnapshot(): Promise<CmsSnapshot> {
  return getCmsSnapshot();
}
