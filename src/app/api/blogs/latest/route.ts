import { getCmsSnapshot } from "@/lib/cms-store";
import { resolveBlogs } from "@/lib/content-localize";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getCmsSnapshot();

  return jsonLocalized(
    {
      blogs: resolveBlogs(cms.blogs, locale).slice(0, 6),
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
