import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <AdminTemplateChrome active="dashboard" title="Dashboard">
      <AdminDashboardClient />
    </AdminTemplateChrome>
  );
}
