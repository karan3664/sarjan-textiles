import { AdminProductFiltersClient } from "@/components/admin/AdminProductFiltersClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";
import { flattenProductFiltersForAdmin } from "@/lib/pages-localize";
import { flattenProductsForAdmin } from "@/lib/product-localize";

export const dynamic = "force-dynamic";

export default async function AdminProductFiltersPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="filters" title="Product Filters">
      <AdminProductFiltersClient
        initialFilters={flattenProductFiltersForAdmin(cms.productFilters)}
        products={flattenProductsForAdmin(cms.products)}
      />
    </AdminTemplateChrome>
  );
}
