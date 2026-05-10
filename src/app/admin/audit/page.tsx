import { AdminAuditLogsClient } from "@/components/admin/AdminAuditLogsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="audit" title="Audit Logs">
      <AdminAuditLogsClient logs={cms.auditLogs ?? []} />
    </AdminTemplateChrome>
  );
}
