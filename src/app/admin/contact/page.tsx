import { AdminContactPageClient } from "@/components/admin/AdminContactPageClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminContactPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="contact" title="Contact Us CMS">
      <AdminContactPageClient initialPages={cms.pages} products={cms.products} />
    </AdminTemplateChrome>
  );
}
