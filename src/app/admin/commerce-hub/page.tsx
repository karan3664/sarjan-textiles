import { AdminCommerceHubClient } from "@/components/admin/AdminCommerceHubClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export default function AdminCommerceHubPage() {
  return (
    <AdminTemplateChrome active="commerceHub" title="Commerce control tower">
      <AdminCommerceHubClient />
    </AdminTemplateChrome>
  );
}
