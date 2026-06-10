import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { readEnglish } from "@/lib/cms-localize";
import { resolveHeaderNavLinks } from "@/lib/header-navigation";
import { resolveCategoryHub } from "@/lib/pages-localize";
import { resolveProduct, resolveProducts } from "@/lib/product-localize";
import type { AppLocale } from "@/lib/localized-text";
import { slugifyCmsSegment } from "@/lib/slug";
import { translateStorefrontNav } from "@/lib/storefront-ui";

export type StorefrontHeaderNavLink = {
  label: string;
  href: string;
  showCategoriesDropdown?: boolean;
};

export type StorefrontCatalogCategory = {
  name: string;
  slug: string;
  productCount: number;
};

export type StorefrontCategoryHub = {
  title: string;
  slug: string;
  subcategories?: Array<{ title: string; href: string }>;
};

/** SSR header chrome — same data as /api/navigation + /api/categories without client fetch flash. */
export async function getStorefrontHeaderData(locale: AppLocale) {
  const cms = await getCachedCmsSnapshot();

  const items: StorefrontHeaderNavLink[] = resolveHeaderNavLinks(
    cms.siteSettings,
  ).map((item) => ({
    ...item,
    label: translateStorefrontNav(item.label, locale),
  }));

  const localizedProducts = resolveProducts(cms.products, locale);
  const seen = new Set<string>();
  const categories: StorefrontCatalogCategory[] = [];

  cms.products.forEach((product, index) => {
    const englishCategory = readEnglish(product.category);
    if (!englishCategory || seen.has(englishCategory)) return;
    seen.add(englishCategory);
    categories.push({
      name: resolveProduct(product, locale).category,
      slug: slugifyCmsSegment(englishCategory),
      productCount: cms.products.filter(
        (item) => readEnglish(item.category) === englishCategory,
      ).length,
    });
  });

  const hubs: StorefrontCategoryHub[] = (cms.categoryHubPages ?? [])
    .filter((page) => page.enabled !== false)
    .sort((a, b) => readEnglish(a.title).localeCompare(readEnglish(b.title)))
    .map((page) => {
      const localized = resolveCategoryHub(page, locale);
      return {
        title: localized.title,
        slug: page.slug,
        subcategories: localized.subcategories.map(
          (sub: { title: string; href: string }) => ({
            title: sub.title,
            href: sub.href,
          }),
        ),
      };
    });

  return { locale, items, categories, hubs };
}
