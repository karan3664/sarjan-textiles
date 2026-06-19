import { AdminAiRevenueClient } from "@/components/admin/AdminAiRevenueClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export const metadata = {
  title: "AI Revenue Dashboard | Sarjan Admin",
};

export default function AdminAiRevenuePage() {
  return (
    <AdminTemplateChrome active="aiRevenue" title="AI revenue dashboard">
      <AdminAiRevenueClient />
    </AdminTemplateChrome>
  );
}
