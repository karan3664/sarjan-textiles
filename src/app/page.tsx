import { HomeDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoMetadata } from "@/lib/page-seo";
import { JsonLd, organizationJsonLd } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata() {
  return cmsSeoMetadata("home");
}

export default function HomePage() {
  return (
    <ModaveShell>
      <JsonLd data={organizationJsonLd()} />
      <HomeDynamic />
    </ModaveShell>
  );
}
