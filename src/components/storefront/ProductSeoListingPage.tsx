import { ProductsListingDynamic } from "@/components/storefront/ModaveSections";
import type { CatalogFilters } from "@/lib/catalog";

export function ProductSeoListingPage({
  title,
  subtitle,
  filters = {},
  q,
  basePath,
  crumbs,
  page = 1,
  sort,
}: {
  title: string;
  subtitle: string;
  filters?: CatalogFilters;
  q?: string;
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
      pageTitle={title}
      pageCrumbs={crumbs ?? ["Home", "Products", title]}
      intro={subtitle}
      basePath={basePath}
      showPageTitle
    />
  );
}
