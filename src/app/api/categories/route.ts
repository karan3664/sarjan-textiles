import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { readEnglish } from "@/lib/cms-localize";
import { resolveProduct, resolveProducts } from "@/lib/product-localize";
import { resolveCategoryHub } from "@/lib/pages-localize";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";
import { slugifyCmsSegment } from "@/lib/slug";
import { groupHubCategoriesByDepartment } from "@/lib/storefront-category-nav";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getLocalizedCmsSnapshot();

  const localizedProducts = resolveProducts(cms.products, locale);
  const seen = new Set<string>();
  const categories: Array<{
    name: string;
    slug: string;
    image?: string;
    productCount: number;
  }> = [];

  cms.products.forEach((product, index) => {
    const englishCategory = readEnglish(product.category);
    if (!englishCategory || seen.has(englishCategory)) return;
    seen.add(englishCategory);
    categories.push({
      name: resolveProduct(product, locale).category,
      slug: slugifyCmsSegment(englishCategory),
      image:
        localizedProducts[index]?.images[0] ?? cms.home.categories[0]?.image,
      productCount: cms.products.filter(
        (item) => readEnglish(item.category) === englishCategory,
      ).length,
    });
  });

  const hubs = (cms.categoryHubPages ?? [])
    .filter((page) => page.enabled !== false)
    .sort((a, b) => readEnglish(a.title).localeCompare(readEnglish(b.title)))
    .map((page) => {
      const localized = resolveCategoryHub(page, locale);
      return {
        title: localized.title,
        slug: page.slug,
        subtitle: localized.subtitle,
        subcategories: localized.subcategories.map((sub) => ({
          title: sub.title,
          href: sub.href,
        })),
      };
    });

  const departmentCategories = groupHubCategoriesByDepartment(hubs);

  return jsonLocalized(
    { categories, hubs, departmentCategories, locale },
    locale,
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}
