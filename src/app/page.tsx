import { HomeDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { JsonLd, organizationJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata() {
  const { home, siteSettings } = await getCachedCmsSnapshot();
  return pageMetadata({
    title: siteSettings.seo.title,
    description: siteSettings.seo.description,
    path: "/",
    image: home.hero.images?.[0],
    keywords: ["Sarjan Textiles", "B2B textile ordering", "wholesale shirts", "textile catalog"],
  });
}

export default function HomePage() {
  return (
    <ModaveShell>
      <JsonLd data={organizationJsonLd()} />
      <HomeDynamic />
    </ModaveShell>
  );
}
