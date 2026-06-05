import { deleteCmsBlog, upsertCmsBlog } from "@/lib/cms-store";
import {
  flattenBlogForAdmin,
  localizeBlogOnSave,
} from "@/lib/content-localize";
import { asStoredBlogs } from "@/lib/cms-admin-view";

export async function POST(request: Request) {
  const blog = await request.json();
  const localized = await localizeBlogOnSave(blog);
  const result = await upsertCmsBlog(asStoredBlogs([localized])[0]!);
  return Response.json({
    ...result,
    blogs: result.blogs.map((item) => flattenBlogForAdmin(item)),
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug)
    return Response.json({ error: "Blog slug required" }, { status: 400 });
  return Response.json(await deleteCmsBlog(slug));
}
