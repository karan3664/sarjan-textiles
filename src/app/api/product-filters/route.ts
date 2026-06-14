import { getCmsSnapshot } from "@/lib/cms-store";
import { resolveProductFilters } from "@/lib/pages-localize";
import { enrichProductFilters } from "@/lib/product-category-filter";
import { resolveProducts } from "@/lib/product-localize";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getCmsSnapshot();
  const products = resolveProducts(cms.products ?? [], locale);
  const filters = enrichProductFilters(
    resolveProductFilters(cms.productFilters ?? [], locale),
    products,
    locale,
  );

  return jsonLocalized(
    {
      filters,
      locale,
    },
    locale,
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}
