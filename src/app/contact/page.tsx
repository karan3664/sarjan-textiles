import { CmsPageDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";

export async function generateMetadata() {
  return cmsSeoMetadata("contact");
}

export default function ContactPage() {
  return (
    <ModaveShell>
      <CmsPageDynamic type="contact" />
    </ModaveShell>
  );
}
