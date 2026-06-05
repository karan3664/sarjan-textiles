import { listActiveCollectionPages } from "@/lib/cms-store";
import { resolveCollection } from "@/lib/pages-localize";
import type { AppLocale } from "@/lib/localized-text";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);

  const collections = (await listActiveCollectionPages()).map((page) => {
    const localized = resolveCollection(page, locale as AppLocale);
    return {
      slug: localized.slug,
      title: localized.title,
      description: localized.description,
      q: localized.q,
      filters: localized.filters,
    };
  });

  return jsonLocalized({ collections, locale }, locale, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
