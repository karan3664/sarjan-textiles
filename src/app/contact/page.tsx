import { CmsPageDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";
import { contactPageJsonLd, JsonLdGraph } from "@/lib/seo";

export async function generateMetadata() {
  return cmsSeoMetadata("contact");
}

export default async function ContactPage() {
  return (
    <ModaveShell>
      <JsonLdGraph items={[contactPageJsonLd()]} />
      <CmsPageDynamic type="contact" />
    </ModaveShell>
  );
}
