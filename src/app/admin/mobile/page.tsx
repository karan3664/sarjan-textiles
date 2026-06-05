import { AdminMobileAppClient } from "@/components/admin/AdminMobileAppClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { AdminTranslateAllPanel } from "@/components/admin/AdminTranslateAllPanel";
import { getCmsSnapshot } from "@/lib/cms-store";
import { flattenMobileAppForAdmin } from "@/lib/mobile-app-cms";

export const dynamic = "force-dynamic";

export default async function AdminMobileAppPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="mobileApp" title="Mobile App CMS">
      <AdminTranslateAllPanel compact />
      <AdminMobileAppClient
        initialConfig={flattenMobileAppForAdmin(cms.mobileApp)}
      />
    </AdminTemplateChrome>
  );
}
