import { AdminCustomSitePagesClient } from "@/components/admin/AdminCustomSitePagesClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminCustomPages() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="customPages" title="Custom site pages">
      <AdminCustomSitePagesClient
        initialPages={cms.customSitePages ?? []}
        products={cms.products}
      />
    </AdminTemplateChrome>
  );
}
