import { getCmsSnapshot } from "@/lib/cms-store";
import { buildMobileConfigResponse } from "@/lib/mobile-app-cms";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

/** Public mobile app CMS — splash, onboarding, home layout, support contacts. */
export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getCmsSnapshot();

  return jsonLocalized(
    buildMobileConfigResponse(
      cms.mobileApp,
      cms.siteSettings,
      cms.home,
      locale,
    ),
    locale,
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
