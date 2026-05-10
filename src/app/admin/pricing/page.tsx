import { AdminPricingClient } from "@/components/admin/AdminPricingClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getAdminCustomers } from "@/lib/admin-customers";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const [cms, customers] = await Promise.all([getCmsSnapshot(), getAdminCustomers()]);

  return (
    <AdminTemplateChrome active="pricing" title="Client Pricing">
      <AdminPricingClient initialRules={cms.clientPricing} clients={customers} products={cms.products} />
    </AdminTemplateChrome>
  );
}
