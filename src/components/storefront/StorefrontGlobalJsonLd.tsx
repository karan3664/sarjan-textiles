import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { globalStructuredDataGraph } from "@/lib/structured-data";
import { JsonLdGraph } from "@/lib/seo";

/** Site-wide Organization, LocalBusiness, and WebSite + SearchAction (once per storefront page). */
export async function StorefrontGlobalJsonLd() {
  const cms = await getCachedCmsSnapshot();
  return <JsonLdGraph items={globalStructuredDataGraph(cms.siteSettings)} />;
}
