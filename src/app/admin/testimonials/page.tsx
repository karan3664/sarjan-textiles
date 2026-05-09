import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { AdminTestimonialsClient } from "@/components/admin/AdminTestimonialsClient";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="testimonials" title="Testimonials">
      <AdminTestimonialsClient initialTestimonials={cms.testimonials} />
    </AdminTemplateChrome>
  );
}
