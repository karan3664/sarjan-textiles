import { AdminBlogCreateClient } from "@/components/admin/AdminBlogCreateClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { flattenBlogForAdmin } from "@/lib/content-localize";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminBlogsCreatePage({
  searchParams,
}: {
  searchParams?: Promise<{ slug?: string }>;
}) {
  const cms = await getCmsSnapshot();
  const params = await searchParams;
  const blogs = cms.blogs.map((blog) => flattenBlogForAdmin(blog));
  const editBlog = params?.slug
    ? blogs.find((blog) => blog.slug === params.slug)
    : undefined;

  return (
    <AdminTemplateChrome
      active="blogs"
      title={editBlog ? "Edit Blog" : "Add New Blog"}
    >
      <AdminBlogCreateClient
        initialBlogs={blogs}
        editBlog={editBlog}
        products={cms.products}
      />
    </AdminTemplateChrome>
  );
}
