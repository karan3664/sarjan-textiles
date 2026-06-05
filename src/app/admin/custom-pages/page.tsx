import { AdminCustomSitePagesClient } from "@/components/admin/AdminCustomSitePagesClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";
import { resolveCustomSitePage } from "@/lib/pages-localize";

export const dynamic = "force-dynamic";

export default async function AdminCustomPages() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="customPages" title="Custom site pages">
      <AdminCustomSitePagesClient
        initialPages={(cms.customSitePages ?? []).map((page) =>
          resolveCustomSitePage(page, "en"),
        )}
        products={cms.products}
      />
    </AdminTemplateChrome>
  );
}
