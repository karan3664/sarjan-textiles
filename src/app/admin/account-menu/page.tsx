import { AdminAccountNavEditor } from "@/components/admin/AdminAccountNavEditor";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { AdminTranslateAllPanel } from "@/components/admin/AdminTranslateAllPanel";

export const dynamic = "force-dynamic";

export default function AdminAccountMenuPage() {
  return (
    <AdminTemplateChrome active="accountMenu" title="Account menu">
      <AdminTranslateAllPanel compact />
      <AdminAccountNavEditor />
    </AdminTemplateChrome>
  );
}
