import { AdminBlogListClient } from "@/components/admin/AdminBlogListClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminBlogsListPage() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="blogs" title="Blogs List">
      <AdminBlogListClient initialBlogs={cms.blogs} />
    </AdminTemplateChrome>
  );
}
