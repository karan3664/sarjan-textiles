import { ProductSeoListingPage } from "@/components/storefront/ProductSeoListingPage";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCollectionPageBySlug } from "@/lib/cms-store";
import { resolveCollection } from "@/lib/pages-localize";
import { localeFromHeaders } from "@/lib/server-locale";
import {
  JsonLd,
  listingBreadcrumbJsonLd,
  pageMetadata,
  siteUrl,
  splitKeywords,
} from "@/lib/seo";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pageRaw = await getCollectionPageBySlug(slug);
  if (!pageRaw) return {};
  const page = resolveCollection(pageRaw, await localeFromHeaders());
  return pageMetadata({
    title: page.metaTitle || `${page.title} | Sarjan Textiles`,
    description: page.metaDescription || page.description,
    path: `/collections/${page.slug}`,
    keywords: splitKeywords(page.keywords),
    image: page.heroImage || "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: page.title,
  });
}

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    category?: string;
    fabric?: string;
    color?: string;
    size?: string;
    stock?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}) {
  const { slug } = await params;
  const pageRaw = await getCollectionPageBySlug(slug);
  if (!pageRaw) notFound();
  const page = resolveCollection(pageRaw, await localeFromHeaders());
  const {
    page: pageNum,
    sort,
    category,
    fabric,
    color,
    size,
    stock,
    minPrice,
    maxPrice,
  } = await searchParams;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page.title,
    description: page.description,
    url: new URL(`/collections/${page.slug}`, siteUrl).toString(),
  };

  return (
    <ModaveShell>
      <JsonLd data={jsonLd} />
      <JsonLd
        data={listingBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Collections", path: "/collections" },
          { name: page.title, path: `/collections/${page.slug}` },
        ])}
      />
      <ProductSeoListingPage
        title={page.title}
        subtitle={page.description}
        page={Number(pageNum ?? 1)}
        sort={sort}
        filters={{
          ...page.filters,
          category,
          fabric,
          color,
          size,
          stock,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
        }}
        q={page.q}
        basePath={`/collections/${page.slug}`}
        crumbs={["Home", "Collections", page.title]}
      />
    </ModaveShell>
  );
}
