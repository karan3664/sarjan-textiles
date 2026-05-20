import { ProductsListingDynamic } from "@/components/storefront/ModaveSections";
import { PageTitle } from "@/components/storefront/PageTitle";
import type { CatalogFilters } from "@/lib/catalog";

export function ProductSeoListingPage({
  title,
  subtitle,
  filters = {},
  q,
}: {
  title: string;
  subtitle: string;
  filters?: CatalogFilters;
  q?: string;
}) {
  return (
    <>
      <PageTitle title={title} crumbs={["Home", "Products", title]} />
      <section className="flat-spacing-2">
        <div className="container">
          <p className="text-muted mb-4">{subtitle}</p>
          <ProductsListingDynamic filters={filters} q={q} />
        </div>
      </section>
    </>
  );
}
