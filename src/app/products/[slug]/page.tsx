import { ProductSeoListingPage } from "@/components/storefront/ProductSeoListingPage";
import { ProductDetailDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCatalogProducts } from "@/lib/catalog";
import { getCmsProductBySlug } from "@/lib/cms-store";
import { getProductCategoryRoute } from "@/lib/product-seo-slug";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";
import {
  JsonLd,
  listingBreadcrumbJsonLd,
  pageMetadata,
  productBreadcrumbJsonLd,
  productJsonLd,
  productMetadata,
  productReviewJsonLd,
  siteUrl,
} from "@/lib/seo";
import { listApprovedProductReviews } from "@/lib/reviews-store";
import { notFound, redirect } from "next/navigation";

/** ISR PDP — public catalog pricing; session pricing via /api/catalog/products. */
export const revalidate = 60;

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
    const reviewSchema = productReviewJsonLd(
      product,
      reviewPayload.items.map((review) => ({
        author: review.clientName,
        rating: review.rating,
        title: review.title,
        body: review.body,
        datePublished: review.createdAt,
      })),
      {
        ratingValue: reviewPayload.stats.averageRating,
        reviewCount: reviewPayload.stats.totalReviews,
      },
    );

    return (
      <ModaveShell>
        <JsonLd data={productJsonLd(product)} />
        <JsonLd data={productBreadcrumbJsonLd(product)} />
        {reviewSchema ? <JsonLd data={reviewSchema} /> : null}
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
        <JsonLd
          data={listingBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Products", path: "/products" },
            {
              name: categoryRoute.title,
              path: `/products/${categoryRoute.slug}`,
            },
          ])}
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
