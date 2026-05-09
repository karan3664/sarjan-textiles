import { AdminBlogCreateClient } from "@/components/admin/AdminBlogCreateClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminBlogsCreatePage({ searchParams }: { searchParams?: Promise<{ slug?: string }> }) {
  const cms = await getCmsSnapshot();
  const params = await searchParams;
  const editBlog = params?.slug ? cms.blogs.find((blog) => blog.slug === params.slug) : undefined;

  return (
    <AdminTemplateChrome active="blogs" title={editBlog ? "Edit Blog" : "Add New Blog"}>
      <AdminBlogCreateClient initialBlogs={cms.blogs} editBlog={editBlog} />
    </AdminTemplateChrome>
  );
}
