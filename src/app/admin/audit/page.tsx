import { AdminAuditLogsClient } from "@/components/admin/AdminAuditLogsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getAuditLogs } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  return (
    <AdminTemplateChrome active="audit" title="Audit Logs">
      <AdminAuditLogsClient logs={await getAuditLogs()} />
    </AdminTemplateChrome>
  );
}
