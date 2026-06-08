import { AdminBackupsClient } from "@/components/admin/AdminBackupsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getBackupStorageInfo, listAppBackups } from "@/lib/admin-backups";

export const dynamic = "force-dynamic";

export default async function AdminBackupsPage() {
  return (
    <AdminTemplateChrome active="backups" title="DB Backup / Restore">
      <AdminBackupsClient
        initialBackups={await listAppBackups()}
        storageInfo={getBackupStorageInfo()}
      />
    </AdminTemplateChrome>
  );
}
