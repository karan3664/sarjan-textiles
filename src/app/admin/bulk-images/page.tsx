import { AdminBulkImageUploadClient } from "@/components/admin/AdminBulkImageUploadClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";

export const dynamic = "force-dynamic";

export default function AdminBulkImagesPage() {
  return (
    <AdminTemplateChrome active="bulkImages" title="Bulk image upload">
      <AdminBulkImageUploadClient />
    </AdminTemplateChrome>
  );
}
