import { AdminSeoClient } from "@/components/admin/AdminSeoClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";
import { flattenSeoPageForAdmin } from "@/lib/pages-localize";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="seo" title="SEO Management">
      <AdminSeoClient
        initialSeoPages={cms.seoPages.map(flattenSeoPageForAdmin)}
      />
    </AdminTemplateChrome>
  );
}
