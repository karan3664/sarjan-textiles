import { ProductSeoListingPage } from "@/components/storefront/ProductSeoListingPage";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCollectionRoute } from "@/lib/product-seo-slug";
import {
  JsonLd,
  listingBreadcrumbJsonLd,
  pageMetadata,
  siteUrl,
} from "@/lib/seo";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const route = getCollectionRoute(slug);
  if (!route) return {};
  return pageMetadata({
    title: `${route.title} | Sarjan Textiles`,
    description: route.description,
    path: `/collections/${route.slug}`,
    keywords: route.keywords,
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
  const route = getCollectionRoute(slug);
  if (!route) notFound();
  const {
    page,
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
    name: route.title,
    description: route.description,
    url: new URL(`/collections/${route.slug}`, siteUrl).toString(),
  };

  return (
    <ModaveShell>
      <JsonLd data={jsonLd} />
      <JsonLd
        data={listingBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Collections", path: "/collections" },
          { name: route.title, path: `/collections/${route.slug}` },
        ])}
      />
      <ProductSeoListingPage
        title={route.title}
        subtitle={route.description}
        page={Number(page ?? 1)}
        sort={sort}
        filters={{
          ...route.filters,
          category,
          fabric,
          color,
          size,
          stock,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
        }}
        q={route.q}
        basePath={`/collections/${route.slug}`}
        crumbs={["Home", "Collections", route.title]}
      />
    </ModaveShell>
  );
}
