import { ProductSeoListingPage } from "@/components/storefront/ProductSeoListingPage";
import { ProductDetailDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCatalogProducts } from "@/lib/catalog";
import { getCmsProductBySlug } from "@/lib/cms-store";
import { getServerClientId } from "@/lib/client-session-server";
import { getProductCategoryRoute } from "@/lib/product-seo-slug";
import {
  JsonLd,
  pageMetadata,
  productBreadcrumbJsonLd,
  productJsonLd,
  productMetadata,
  siteUrl,
} from "@/lib/seo";
import { notFound, redirect } from "next/navigation";

/** Keep PDP stock/OOS in sync with CMS (same issue as listing ISR cache). */
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [];
}

async function loadProductForSlug(slug: string) {
  const clientId = await getServerClientId();
  const priced = await getCatalogProducts({
    ids: [slug],
    clientId,
    limit: 1,
  });
  if (priced.items[0]) return priced.items[0];
  return getCmsProductBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProductForSlug(slug);
  if (product) return productMetadata(product);

  const categoryRoute = getProductCategoryRoute(slug);
  if (!categoryRoute) return {};

  return pageMetadata({
    title: `${categoryRoute.title} | Wholesale Catalog`,
    description: categoryRoute.description,
    path: `/products/${categoryRoute.slug}`,
    keywords: categoryRoute.keywords,
  });
}

export default async function ProductSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProductForSlug(slug);

  if (product) {
    if (product.slug !== slug) {
      redirect(`/products/${product.slug}`);
    }
    return (
      <ModaveShell>
        <JsonLd data={productJsonLd(product)} />
        <JsonLd data={productBreadcrumbJsonLd(product)} />
        <ProductDetailDynamic product={product} />
      </ModaveShell>
    );
  }

  const categoryRoute = getProductCategoryRoute(slug);
  if (categoryRoute) {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: categoryRoute.title,
      description: categoryRoute.description,
      url: new URL(`/products/${categoryRoute.slug}`, siteUrl).toString(),
    };
    return (
      <ModaveShell>
        <JsonLd data={jsonLd} />
        <ProductSeoListingPage
          title={categoryRoute.title}
          subtitle={categoryRoute.description}
          filters={categoryRoute.filters}
          q={categoryRoute.q}
        />
      </ModaveShell>
    );
  }

  notFound();
}
