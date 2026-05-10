import { AdminReportsClient } from "@/components/admin/AdminReportsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getAdminReportsData } from "@/lib/admin-reports";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  return (
    <AdminTemplateChrome active="reports" title="Reports & Analytics">
      <AdminReportsClient data={await getAdminReportsData()} />
    </AdminTemplateChrome>
  );
}
