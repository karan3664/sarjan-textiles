import { ProductsListingDynamic } from "@/components/storefront/ModaveSections";
import type { CatalogFilters } from "@/lib/catalog";

export function ProductSeoListingPage({
  title,
  subtitle,
  filters = {},
  q,
  collection,
  basePath,
  crumbs,
  page = 1,
  sort,
}: {
  title: string;
  subtitle: string;
  filters?: CatalogFilters;
  q?: string;
  collection?: string;
  basePath: string;
  crumbs?: string[];
  page?: number;
  sort?: string;
}) {
  return (
    <ProductsListingDynamic
      page={page}
      sort={sort}
      filters={filters}
      q={q}
      collection={collection}
      pageTitle={title}
      pageCrumbs={crumbs ?? ["Home", "Products", title]}
      intro={subtitle}
      basePath={basePath}
      showPageTitle
    />
  );
}
