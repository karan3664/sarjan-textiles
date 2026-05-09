import { AdminProductListClient } from "@/components/admin/AdminProductListClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminProductsListPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="products" title="Products List">
      <AdminProductListClient initialProducts={cms.products} />
    </AdminTemplateChrome>
  );
}
