import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { resolveHeaderNavLinks } from "@/lib/header-navigation";

export const dynamic = "force-dynamic";

export async function GET() {
  const cms = await getCachedCmsSnapshot();
  return Response.json({
    items: resolveHeaderNavLinks(cms.siteSettings),
  });
}
