import { AdminPromotionsClient } from "@/components/admin/AdminPromotionsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export const metadata = {
  title: "Promotions | Sarjan Admin",
};

export default function AdminPromotionsPage() {
  return (
    <AdminTemplateChrome active="promotions" title="Internal promotions">
      <AdminPromotionsClient />
    </AdminTemplateChrome>
  );
}
