import { AdminInventoryClient } from "@/components/admin/AdminInventoryClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";
import { flattenProductsForAdmin } from "@/lib/product-localize";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="inventory" title="Inventory Management">
      <AdminInventoryClient
        initialProducts={flattenProductsForAdmin(cms.products)}
        initialLogs={cms.inventoryLogs ?? []}
      />
    </AdminTemplateChrome>
  );
}
