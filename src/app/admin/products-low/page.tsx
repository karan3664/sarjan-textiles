import { AdminInventoryClient } from "@/components/admin/AdminInventoryClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="inventory" title="Inventory Management">
      <AdminInventoryClient initialProducts={cms.products} initialLogs={cms.inventoryLogs ?? []} />
    </AdminTemplateChrome>
  );
}
