import { CategoryHubIndexContent } from "@/components/storefront/CategoryHubPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { JsonLd, pageMetadata, siteUrl } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata() {
  const cms = await getCachedCmsSnapshot();
  return pageMetadata({
    title: `Shop by category | ${cms.siteSettings.brandName}`,
    description:
      "Browse Sarjan Textiles main category hubs: kurta lines, shirt families, and more wholesale-ready assortments.",
    path: "/categories",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: `${cms.siteSettings.brandName} categories`,
    keywords: [
      "textile categories",
      "wholesale kurtas",
      "Sarjan Textiles catalog",
    ],
  });
}

export default async function CategoriesIndexPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Shop by category",
    url: `${siteUrl}/categories`,
  };

  return (
    <ModaveShell>
      <JsonLd data={jsonLd} />
      <CategoryHubIndexContent />
    </ModaveShell>
  );
}
