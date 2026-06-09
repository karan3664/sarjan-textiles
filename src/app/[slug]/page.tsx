import { CustomSitePageView } from "@/components/storefront/CustomSitePageView";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import {
  customSitePagePath,
  loadCustomSitePage,
  RESERVED_CUSTOM_SITE_SLUGS,
} from "@/lib/custom-site-page-route";
import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { JsonLd, pageMetadata, splitKeywords } from "@/lib/seo";
import { resolveCustomSitePage } from "@/lib/pages-localize";
import { localeFromHeaders } from "@/lib/server-locale";

export const revalidate = 300;

export async function generateStaticParams() {
  const cms = await getLocalizedCmsSnapshot();
  return (cms.customSitePages ?? [])
    .filter((page) => page.enabled !== false && page.slug?.trim())
    .filter((page) => !RESERVED_CUSTOM_SITE_SLUGS.has(page.slug.toLowerCase()))
    .map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_CUSTOM_SITE_SLUGS.has(slug.toLowerCase())) {
    return {};
  }
  const locale = await localeFromHeaders();
  const cms = await getLocalizedCmsSnapshot();
  const pageRaw =
    cms.customSitePages.find(
      (page) => page.slug === slug && page.enabled !== false,
    ) ?? null;
  if (!pageRaw) {
    return {};
  }
  const page = resolveCustomSitePage(pageRaw, locale);
  return pageMetadata({
    title: page.metaTitle || `${page.title} | ${cms.siteSettings.brandName}`,
    description:
      page.metaDescription ||
      page.heroSubtitle ||
      `${page.title} — Sarjan Textiles.`,
    path: customSitePagePath(page.slug),
    image: page.heroImage || "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: page.title,
    keywords: splitKeywords(page.keywords),
  });
}

export default async function CustomSiteRootSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { page, products } = await loadCustomSitePage(slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.metaDescription || page.heroSubtitle,
  };

  return (
    <ModaveShell>
      <JsonLd data={jsonLd} />
      <CustomSitePageView page={page} products={products} />
    </ModaveShell>
  );
}
