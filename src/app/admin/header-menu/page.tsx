import { AdminHeaderNavEditor } from "@/components/admin/AdminHeaderNavEditor";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export const dynamic = "force-dynamic";

export default function AdminHeaderMenuPage() {
  return (
    <AdminTemplateChrome active="headerMenu" title="Header menu">
      <AdminHeaderNavEditor />
    </AdminTemplateChrome>
  );
}
