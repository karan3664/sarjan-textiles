import { AdminHomePageClient } from "@/components/admin/AdminHomePageClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";
import { resolveHomeForLocale } from "@/lib/content-localize";

export const dynamic = "force-dynamic";

export default async function AdminHomeCmsPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="home" title="Home Page CMS">
      <AdminHomePageClient
        initialHome={resolveHomeForLocale(cms.home, "en")}
        products={cms.products}
      />
    </AdminTemplateChrome>
  );
}
