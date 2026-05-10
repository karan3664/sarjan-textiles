import { CmsPageDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { cmsPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const { pages } = await getCachedCmsSnapshot();
  return cmsPageMetadata("about", pages.about);
}

export default function AboutPage() {
  return (
    <ModaveShell>
      <CmsPageDynamic type="about" />
    </ModaveShell>
  );
}
