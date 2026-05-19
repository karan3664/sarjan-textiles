import { AdminBlogCommentsClient } from "@/components/admin/AdminBlogCommentsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getAllBlogComments } from "@/lib/blog-comments-store";

export const dynamic = "force-dynamic";

export default async function AdminBlogCommentsPage() {
  const comments = await getAllBlogComments();

  return (
    <AdminTemplateChrome active="blogComments" title="Blog comments">
      <p className="body-text-1 mb_20">
        New storefront comments start as <strong>pending</strong>. Only{" "}
        <strong>approved</strong> comments appear on the blog. Official replies
        show with the Sarjan Textiles logo on the live site.
      </p>
      <AdminBlogCommentsClient initialComments={comments} />
    </AdminTemplateChrome>
  );
}
