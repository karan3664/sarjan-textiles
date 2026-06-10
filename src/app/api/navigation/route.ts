import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { resolveHeaderNavLinks } from "@/lib/header-navigation";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";
import { translateStorefrontNav } from "@/lib/storefront-ui";
import { navApiCacheControl } from "@/lib/storefront-cache";

export const revalidate = 300;

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getCachedCmsSnapshot();
  const items = resolveHeaderNavLinks(cms.siteSettings).map((item) => ({
    ...item,
    label: translateStorefrontNav(item.label, locale),
  }));

  const headers = new Headers();
  headers.set("Cache-Control", navApiCacheControl());

  return jsonLocalized({ items, locale }, locale, { headers });
}
