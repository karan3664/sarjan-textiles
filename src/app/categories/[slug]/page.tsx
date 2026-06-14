import { notFound } from "next/navigation";
import { CategoryHubDetailContent } from "@/components/storefront/CategoryHubPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { resolveCategoryHub } from "@/lib/pages-localize";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";
import {
  categoryHubDetailJsonLd,
  JsonLdGraph,
  pageMetadata,
  splitKeywords,
} from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cms = await getCachedCmsSnapshot();
  const hubRaw =
    cms.categoryHubPages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null;
  if (!hubRaw) return {};
  const hub = resolveCategoryHub(hubRaw, getCacheableStorefrontLocale());
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
  const cms = await getCachedCmsSnapshot();
  const hubRaw =
    cms.categoryHubPages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null;
  if (!hubRaw) notFound();
  const hub = resolveCategoryHub(hubRaw, getCacheableStorefrontLocale());

  const jsonLd = categoryHubDetailJsonLd(hub);

  return (
    <ModaveShell>
      <JsonLdGraph items={jsonLd} />
      <CategoryHubDetailContent hub={hub} />
    </ModaveShell>
  );
}
