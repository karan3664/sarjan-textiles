import { AdminCustomerManagementClient } from "@/components/admin/AdminCustomerManagementClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getAdminCustomers } from "@/lib/admin-customers";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomers();

  return (
    <AdminTemplateChrome active="customers" title="Customer Management">
      <AdminCustomerManagementClient initialCustomers={customers} />
    </AdminTemplateChrome>
  );
}
