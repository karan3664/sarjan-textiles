import { CmsPageDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoJsonLd, cmsSeoMetadata } from "@/lib/page-seo";
import { JsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return cmsSeoMetadata("contact");
}

export default async function ContactPage() {
  return (
    <ModaveShell>
      <JsonLd data={await cmsSeoJsonLd("contact")} />
      <CmsPageDynamic type="contact" />
    </ModaveShell>
  );
}
