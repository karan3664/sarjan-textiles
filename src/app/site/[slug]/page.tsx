import { notFound } from "next/navigation";
import { CustomSitePageView } from "@/components/storefront/CustomSitePageView";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { resolveCustomSitePage } from "@/lib/pages-localize";
import { localeFromHeaders } from "@/lib/server-locale";
import { JsonLd, pageMetadata, splitKeywords } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await localeFromHeaders();
  const cms = await getLocalizedCmsSnapshot();
  const pageRaw =
    cms.customSitePages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null;
  if (!pageRaw) return {};
  const page = resolveCustomSitePage(pageRaw, locale);
  return pageMetadata({
    title: page.metaTitle || `${page.title} | ${cms.siteSettings.brandName}`,
    description:
      page.metaDescription ||
      page.heroSubtitle ||
      `${page.title} — Sarjan Textiles.`,
    path: `/site/${page.slug}`,
    image: page.heroImage || "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: page.title,
    keywords: splitKeywords(page.keywords),
  });
}

export default async function CustomSiteSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await localeFromHeaders();
  const cms = await getLocalizedCmsSnapshot();
  const pageRaw =
    cms.customSitePages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null;
  if (!pageRaw) notFound();
  const page = resolveCustomSitePage(pageRaw, locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.metaDescription || page.heroSubtitle,
  };

  return (
    <ModaveShell>
      <JsonLd data={jsonLd} />
      <CustomSitePageView page={page} products={cms.products} />
    </ModaveShell>
  );
}
