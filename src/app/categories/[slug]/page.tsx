import { notFound } from "next/navigation";
import { CategoryHubDetailContent } from "@/components/storefront/CategoryHubPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import {
  getCategoryHubPageBySlug,
  getCachedCmsSnapshot,
} from "@/lib/cms-store";
import { JsonLd, pageMetadata, splitKeywords } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hub = await getCategoryHubPageBySlug(slug);
  if (!hub) return {};
  const cms = await getCachedCmsSnapshot();
  return pageMetadata({
    title: hub.metaTitle || `${hub.title} | ${cms.siteSettings.brandName}`,
    description:
      hub.metaDescription ||
      hub.intro ||
      hub.subtitle ||
      `Browse ${hub.title} sub-lines and Sarjan Textiles wholesale catalog.`,
    path: `/categories/${hub.slug}`,
    image: hub.heroImage || "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: hub.title,
    keywords: splitKeywords(hub.keywords),
  });
}

export default async function CategoryHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hub = await getCategoryHubPageBySlug(slug);
  if (!hub) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: hub.title,
    description: hub.intro || hub.subtitle,
  };

  return (
    <ModaveShell>
      <JsonLd data={jsonLd} />
      <CategoryHubDetailContent hub={hub} />
    </ModaveShell>
  );
}
