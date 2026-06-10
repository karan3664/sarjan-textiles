import { HomeDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoJsonLd, cmsSeoMetadata } from "@/lib/page-seo";
import { JsonLd, organizationJsonLd } from "@/lib/seo";
/** ISR: stock/OOS ribbons refresh client-side; catalog data revalidates every 60s. */
export const revalidate = 60;

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
