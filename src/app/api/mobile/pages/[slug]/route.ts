import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { resolveCustomSitePage } from "@/lib/pages-localize";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const locale = localeFromRequest(request);
  const cms = await getLocalizedCmsSnapshot();
  const pageRaw =
    cms.customSitePages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null;
  if (!pageRaw) {
    return new Response(JSON.stringify({ error: "Page not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const page = resolveCustomSitePage(pageRaw, locale);
  return jsonLocalized({ page, locale }, locale);
}
