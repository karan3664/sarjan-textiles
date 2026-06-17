import { AdminProductListClient } from "@/components/admin/AdminProductListClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";
import { flattenProductsForAdmin } from "@/lib/product-localize";

export const dynamic = "force-dynamic";

export default async function AdminProductsListPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="products" title="Products List">
      <AdminProductListClient
        initialProducts={flattenProductsForAdmin(cms.products ?? [])}
      />
    </AdminTemplateChrome>
  );
}
