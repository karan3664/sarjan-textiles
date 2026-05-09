import { AdminOrderManagementClient } from "@/components/admin/AdminOrderManagementClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getAdminOrders } from "@/lib/admin-orders";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  return (
    <AdminTemplateChrome active="orders" title="Order Management">
      <AdminOrderManagementClient initialOrders={await getAdminOrders()} mode="orders" />
    </AdminTemplateChrome>
  );
}
