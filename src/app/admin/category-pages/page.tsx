import { AdminCategoryHubsClient } from "@/components/admin/AdminCategoryHubsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminCategoryPages() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="categoryPages" title="Category landing pages">
      <AdminCategoryHubsClient initialHubs={cms.categoryHubPages ?? []} />
    </AdminTemplateChrome>
  );
}
