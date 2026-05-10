import { CmsPageDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";

export async function generateMetadata() {
  return cmsSeoMetadata("about");
}

export default function AboutPage() {
  return (
    <ModaveShell>
      <CmsPageDynamic type="about" />
    </ModaveShell>
  );
}
