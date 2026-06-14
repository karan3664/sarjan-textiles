import { CmsPageDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoJsonLd, cmsSeoMetadata } from "@/lib/page-seo";
import { JsonLdGraph } from "@/lib/seo";

export async function generateMetadata() {
  return cmsSeoMetadata("about");
}

export default async function AboutPage() {
  return (
    <ModaveShell>
      <JsonLdGraph items={[await cmsSeoJsonLd("about")]} />
      <CmsPageDynamic type="about" />
    </ModaveShell>
  );
}
