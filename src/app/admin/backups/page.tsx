import { AdminBackupsClient } from "@/components/admin/AdminBackupsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { listAppBackups } from "@/lib/admin-backups";

export const dynamic = "force-dynamic";

export default async function AdminBackupsPage() {
  return (
    <AdminTemplateChrome active="backups" title="DB Backup / Restore">
      <AdminBackupsClient initialBackups={await listAppBackups()} />
    </AdminTemplateChrome>
  );
}
