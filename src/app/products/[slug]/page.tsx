import { ProductSeoListingPage } from "@/components/storefront/ProductSeoListingPage";
import { ProductDetailDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCatalogProducts } from "@/lib/catalog";
import { getCmsProductBySlug } from "@/lib/cms-store";
import { resolveProduct } from "@/lib/product-localize";
import { getProductCategoryRoute } from "@/lib/product-seo-slug";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";
import {
  JsonLdGraph,
  collectionPageJsonLd,
  listingBreadcrumbJsonLd,
  pageMetadata,
  productBreadcrumbJsonLd,
  productCatalogItemListJsonLd,
  productJsonLd,
  productMetadata,
} from "@/lib/seo";
import { listApprovedProductReviews } from "@/lib/reviews-store";
import { notFound, redirect } from "next/navigation";

/** PDP is rendered on demand — avoids ISR + dynamic CMS read conflicts in production. */
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [];
}

async function loadProductForSlug(slug: string) {
  const locale = getCacheableStorefrontLocale();
  const priced = await getCatalogProducts({
    ids: [slug],
    limit: 1,
    locale,
  });
  if (priced.items[0]) return priced.items[0];
  const raw = await getCmsProductBySlug(slug);
  return raw ? resolveProduct(raw, locale) : null;
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
  const product = await loadProductForSlug(slug);

  if (product) {
    if (product.slug !== slug) {
      redirect(`/products/${product.slug}`);
    }
    const reviewPayload = await listApprovedProductReviews(product.slug, {
      sort: "newest",
      page: 1,
      limit: 8,
    });
    const reviewSchema = productJsonLd(
      product,
      reviewPayload.items.map((review) => ({
        author: review.clientName,
        rating: review.rating,
        title: review.title,
        body: review.body,
        datePublished: review.createdAt,
      })),
      reviewPayload.stats.totalReviews
        ? {
            ratingValue: reviewPayload.stats.averageRating,
            reviewCount: reviewPayload.stats.totalReviews,
          }
        : undefined,
    );

    return (
      <ModaveShell>
        <JsonLdGraph items={[reviewSchema, productBreadcrumbJsonLd(product)]} />
        <ProductDetailDynamic product={product} />
      </ModaveShell>
    );
  }

  const categoryRoute = getProductCategoryRoute(slug);
  if (categoryRoute) {
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
    const locale = getCacheableStorefrontLocale();
    const catalog = await getCatalogProducts({
      page: Number(page ?? 1),
      sort,
      filters: {
        ...categoryRoute.filters,
        category,
        fabric,
        color,
        size,
        stock,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      },
      q: categoryRoute.q,
      locale,
      limit: 24,
    });
    const jsonLd = collectionPageJsonLd({
      name: categoryRoute.title,
      description: categoryRoute.description,
      path: `/products/${categoryRoute.slug}`,
    });
    const itemList = productCatalogItemListJsonLd({
      name: categoryRoute.title,
      path: `/products/${categoryRoute.slug}`,
      products: catalog.items,
    });
    return (
      <ModaveShell>
        <JsonLdGraph
          items={[
            jsonLd,
            itemList,
            listingBreadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Products", path: "/products" },
              {
                name: categoryRoute.title,
                path: `/products/${categoryRoute.slug}`,
              },
            ]),
          ]}
        />
        <ProductSeoListingPage
          title={categoryRoute.title}
          subtitle={categoryRoute.description}
          page={Number(page ?? 1)}
          sort={sort}
          filters={{
            ...categoryRoute.filters,
            category,
            fabric,
            color,
            size,
            stock,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
          }}
          q={categoryRoute.q}
          basePath={`/products/${categoryRoute.slug}`}
          crumbs={["Home", "Products", categoryRoute.title]}
        />
      </ModaveShell>
    );
  }

  notFound();
}
