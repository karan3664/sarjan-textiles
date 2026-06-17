import { listActiveCollectionPages } from "@/lib/cms-store";
import { getCatalogProducts } from "@/lib/catalog";
import { resolveCollection } from "@/lib/pages-localize";
import type { AppLocale } from "@/lib/localized-text";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);

  const collections = await Promise.all(
    (await listActiveCollectionPages()).map(async (page) => {
      const localized = resolveCollection(page, locale as AppLocale);
      const catalog = await getCatalogProducts({
        collection: page.slug,
        filters: page.filters,
        locale: locale as AppLocale,
        limit: 1,
        page: 1,
      });
      const previewImage = catalog.items[0]?.images?.[0];
      return {
        slug: localized.slug,
        title: localized.title,
        description: localized.description,
        q: localized.q,
        filters: localized.filters,
        productCount: catalog.total,
        previewImage,
      };
    }),
  );

  return jsonLocalized({ collections, locale }, locale, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
