import { AboutSectionContent } from "@/components/storefront/AboutPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoJsonLd, cmsSeoMetadata } from "@/lib/page-seo";
import { JsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return cmsSeoMetadata("about");
}

export default async function AboutMissionPage() {
  return (
    <ModaveShell>
      <JsonLd data={await cmsSeoJsonLd("about")} />
      <AboutSectionContent section="mission" />
    </ModaveShell>
  );
}
