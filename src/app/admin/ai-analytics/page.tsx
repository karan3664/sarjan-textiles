import { AdminAiAnalyticsClient } from "@/components/admin/AdminAiAnalyticsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export const metadata = {
  title: "Sarjan AI Analytics | Sarjan Admin",
};

export default function AdminAiAnalyticsPage() {
  return (
    <AdminTemplateChrome active="aiAnalytics" title="Sarjan AI analytics">
      <AdminAiAnalyticsClient />
    </AdminTemplateChrome>
  );
}
