import { AdminOrderManagementClient } from "@/components/admin/AdminOrderManagementClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getAdminOrders } from "@/lib/admin-orders";

export const dynamic = "force-dynamic";

export default async function AdminDispatchPage() {
  return (
    <AdminTemplateChrome active="dispatch" title="Dispatch Management">
      <AdminOrderManagementClient initialOrders={await getAdminOrders()} mode="dispatch" />
    </AdminTemplateChrome>
  );
}
