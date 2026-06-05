import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { resolveHeaderNavLinks } from "@/lib/header-navigation";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";
import { translateStorefrontNav } from "@/lib/storefront-ui";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getLocalizedCmsSnapshot();
  const items = resolveHeaderNavLinks(cms.siteSettings).map((item) => ({
    ...item,
    label: translateStorefrontNav(item.label, locale),
  }));

  return jsonLocalized({ items, locale }, locale);
}
