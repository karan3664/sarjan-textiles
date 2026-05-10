import { CmsPageDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { cmsPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const { pages } = await getCachedCmsSnapshot();
  return cmsPageMetadata("contact", pages.contact);
}

export default function ContactPage() {
  return (
    <ModaveShell>
      <CmsPageDynamic type="contact" />
    </ModaveShell>
  );
}
