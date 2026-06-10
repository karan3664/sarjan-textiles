import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { resolveAccountNavigation } from "@/lib/account-navigation";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";
import { translateStorefrontNav } from "@/lib/storefront-ui";
import { navApiCacheControl } from "@/lib/storefront-cache";

export const revalidate = 300;

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getCachedCmsSnapshot();
  const header = resolveAccountNavigation(cms.siteSettings, {
    placement: "header",
  }).map((item) => ({
    ...item,
    label: translateStorefrontNav(item.label, locale),
  }));
  const sidebar = resolveAccountNavigation(cms.siteSettings, {
    placement: "sidebar",
  }).map((item) => ({
    ...item,
    label: translateStorefrontNav(item.label, locale),
  }));

  const headers = new Headers();
  headers.set("Cache-Control", navApiCacheControl());

  return jsonLocalized({ header, sidebar, locale }, locale, { headers });
}
