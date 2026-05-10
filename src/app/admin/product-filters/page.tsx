import { AdminProductFiltersClient } from "@/components/admin/AdminProductFiltersClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminProductFiltersPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="filters" title="Product Filters">
      <AdminProductFiltersClient initialFilters={cms.productFilters} products={cms.products} />
    </AdminTemplateChrome>
  );
}
