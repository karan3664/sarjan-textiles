import { AdminAiProductStudioClient } from "@/components/admin/AdminAiProductStudioClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export const dynamic = "force-dynamic";

export default function AdminAiProductStudioPage() {
  return (
    <AdminTemplateChrome active="studio" title="AI Product Studio">
      <AdminAiProductStudioClient />
    </AdminTemplateChrome>
  );
}
