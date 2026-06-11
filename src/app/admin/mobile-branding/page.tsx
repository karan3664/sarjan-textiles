import { AdminMobileBrandingClient } from "@/components/admin/AdminMobileBrandingClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";
import { flattenMobileAppForAdmin } from "@/lib/mobile-app-cms";

export const dynamic = "force-dynamic";

export default async function AdminMobileBrandingPage() {
  const cms = await getCmsSnapshot();
  const mobileApp = flattenMobileAppForAdmin(cms.mobileApp);

  return (
    <AdminTemplateChrome active="mobileBranding" title="Mobile Branding">
      <AdminMobileBrandingClient initialMobileApp={mobileApp} />
    </AdminTemplateChrome>
  );
}
