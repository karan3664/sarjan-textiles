import { getCmsSnapshot } from "@/lib/cms-store";
import { resolveBlogs } from "@/lib/content-localize";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(
    50,
    Math.max(
      1,
      Number(searchParams.get("pageSize") ?? searchParams.get("limit") ?? 12),
    ),
  );

  const cms = await getCmsSnapshot();
  const all = resolveBlogs(cms.blogs ?? [], locale);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const blogs = all.slice(start, start + pageSize);

  return jsonLocalized({ blogs, page, pageSize, total, totalPages }, locale, {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
    },
  });
}
