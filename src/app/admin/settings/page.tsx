import { AdminSiteSettingsClient } from "@/components/admin/AdminSiteSettingsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const cms = await getCmsSnapshot();
  return (
    <AdminTemplateChrome active="settings" title="Site Settings">
      <AdminSiteSettingsClient initialSiteSettings={cms.siteSettings} />
    </AdminTemplateChrome>
  );
}
