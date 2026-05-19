import { HomeDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoJsonLd, cmsSeoMetadata } from "@/lib/page-seo";
import { JsonLd, organizationJsonLd } from "@/lib/seo";

/** Featured grids must reflect current stock/OOS ribbons. */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return cmsSeoMetadata("home");
}

export default async function HomePage() {
  return (
    <ModaveShell>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={await cmsSeoJsonLd("home")} />
      <HomeDynamic />
    </ModaveShell>
  );
}
