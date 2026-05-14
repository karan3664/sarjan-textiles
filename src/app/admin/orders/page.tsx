import { AdminOrderManagementClient } from "@/components/admin/AdminOrderManagementClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getAdminCustomers } from "@/lib/admin-customers";
import { getAdminOrders } from "@/lib/admin-orders";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const [orders, customers, cms] = await Promise.all([getAdminOrders(), getAdminCustomers(), getCmsSnapshot()]);
  return (
    <AdminTemplateChrome active="orders" title="Order Management">
      <AdminOrderManagementClient initialOrders={orders} clients={customers} products={cms.products} mode="orders" />
    </AdminTemplateChrome>
  );
}
