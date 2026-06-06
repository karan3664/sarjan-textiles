import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { resolveAccountNavigation } from "@/lib/account-navigation";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";
import { translateStorefrontNav } from "@/lib/storefront-ui";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getLocalizedCmsSnapshot();
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

  return jsonLocalized({ header, sidebar, locale }, locale);
}
