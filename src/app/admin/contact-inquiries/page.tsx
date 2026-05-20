import { AdminContactInquiriesClient } from "@/components/admin/AdminContactInquiriesClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getFeedbacks } from "@/lib/local-db";

export const dynamic = "force-dynamic";

export default async function AdminContactInquiriesPage() {
  const inquiries = await getFeedbacks();

  return (
    <AdminTemplateChrome active="inquiries" title="Order Feedback">
      <AdminContactInquiriesClient initialInquiries={inquiries} />
    </AdminTemplateChrome>
  );
}
