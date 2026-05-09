import { AdminHomePageClient } from "@/components/admin/AdminHomePageClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminHomeCmsPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="home" title="Home Page CMS">
      <AdminHomePageClient initialHome={cms.home} />
    </AdminTemplateChrome>
  );
}
