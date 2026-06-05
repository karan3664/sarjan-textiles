import { getCmsSnapshot } from "@/lib/cms-store";
import { resolveProductFilters } from "@/lib/pages-localize";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getCmsSnapshot();

  return jsonLocalized(
    {
      filters: resolveProductFilters(cms.productFilters ?? [], locale),
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
