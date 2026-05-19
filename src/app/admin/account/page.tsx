import { AdminAccountClient } from "@/components/admin/AdminAccountClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export const dynamic = "force-dynamic";

export default function AdminAccountPage() {
  return (
    <AdminTemplateChrome active="account" title="Account & security">
      <AdminAccountClient />
    </AdminTemplateChrome>
  );
}
