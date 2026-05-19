import { ProductsListingDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { cmsSeoJsonLd, cmsSeoMetadata } from "@/lib/page-seo";
import {
  productsListingCanonical,
  type ProductListingSearch,
} from "@/lib/products-canonical";
import { JsonLd } from "@/lib/seo";

/** Stock ribbons must match live CMS; avoid stale ISR HTML for catalog. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ProductListingSearch>;
}) {
  const base = await cmsSeoMetadata("products");
  const canonical = productsListingCanonical(await searchParams);
  return {
    ...base,
    alternates: {
      ...(typeof base.alternates === "object" && base.alternates
        ? base.alternates
        : {}),
      canonical,
    },
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    q?: string;
    category?: string;
    fabric?: string;
    color?: string;
    size?: string;
    stock?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}) {
  const {
    page,
    sort,
    q,
    category,
    fabric,
    color,
    size,
    stock,
    minPrice,
    maxPrice,
  } = await searchParams;

  const listingSearch: ProductListingSearch = {
    page,
    sort,
    q,
    category,
    fabric,
    color,
    size,
    stock,
    minPrice: minPrice !== undefined ? String(minPrice) : undefined,
    maxPrice: maxPrice !== undefined ? String(maxPrice) : undefined,
  };
  const jsonLdBase = await cmsSeoJsonLd("products");
  const jsonLd = {
    ...jsonLdBase,
    url: productsListingCanonical(listingSearch),
  };

  return (
    <ModaveShell>
      <JsonLd data={jsonLd} />
      <ProductsListingDynamic
        page={Number(page ?? 1)}
        sort={sort}
        q={q}
        filters={{
          category,
          fabric,
          color,
          size,
          stock,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
        }}
      />
    </ModaveShell>
  );
}
