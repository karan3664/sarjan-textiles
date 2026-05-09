import { AdminOrderManagementClient } from "@/components/admin/AdminOrderManagementClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getAdminOrders } from "@/lib/admin-orders";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  return (
    <AdminTemplateChrome active="payments" title="Payment & Credit Management">
      <AdminOrderManagementClient initialOrders={await getAdminOrders()} mode="payments" />
    </AdminTemplateChrome>
  );
}
