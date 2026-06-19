import { AdminAiLeadsClient } from "@/components/admin/AdminAiLeadsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export const metadata = {
  title: "AI Lead Dashboard | Sarjan Admin",
};

export default function AdminAiLeadsPage() {
  return (
    <AdminTemplateChrome active="aiLeads" title="AI lead dashboard">
      <AdminAiLeadsClient />
    </AdminTemplateChrome>
  );
}
