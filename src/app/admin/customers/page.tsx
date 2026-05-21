import { AdminCustomerManagementClient } from "@/components/admin/AdminCustomerManagementClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getAdminCustomers } from "@/lib/admin-customers";
import { getCmsSnapshot } from "@/lib/cms-store";
import { buildProductImageBySlug } from "@/lib/product-image-resolve";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const [customers, cms] = await Promise.all([
    getAdminCustomers(),
    getCmsSnapshot(),
  ]);
  const productImageBySlug = buildProductImageBySlug(cms.products);

  return (
    <AdminTemplateChrome active="customers" title="Customer Management">
      <AdminCustomerManagementClient
        initialCustomers={customers}
        productImageBySlug={productImageBySlug}
      />
    </AdminTemplateChrome>
  );
}
