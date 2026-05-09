import { AdminAboutClient } from "@/components/admin/AdminAboutClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminAboutPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="about" title="About Us CMS">
      <AdminAboutClient initialPages={cms.pages} />
    </AdminTemplateChrome>
  );
}
