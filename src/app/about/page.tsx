import { CmsPageDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoJsonLd, cmsSeoMetadata } from "@/lib/page-seo";
import { JsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return cmsSeoMetadata("about");
}

export default async function AboutPage() {
  return (
    <ModaveShell>
      <JsonLd data={await cmsSeoJsonLd("about")} />
      <CmsPageDynamic type="about" />
    </ModaveShell>
  );
}
