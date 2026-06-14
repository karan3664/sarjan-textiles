import { AboutSectionContent } from "@/components/storefront/AboutPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoJsonLd, cmsSeoMetadata } from "@/lib/page-seo";
import { JsonLdGraph } from "@/lib/seo";

export async function generateMetadata() {
  return cmsSeoMetadata("about");
}

export default async function AboutHistoryPage() {
  return (
    <ModaveShell>
      <JsonLdGraph items={[await cmsSeoJsonLd("about")]} />
      <AboutSectionContent section="history" />
    </ModaveShell>
  );
}
