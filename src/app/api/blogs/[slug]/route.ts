import { getCmsBlogBySlug } from "@/lib/cms-store";

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const blog = await getCmsBlogBySlug(slug);
  if (!blog) {
    return Response.json({ error: "Blog not found" }, { status: 404 });
  }

  const image =
    (blog as { image?: string; coverImage?: string }).image ??
    (blog as { coverImage?: string }).coverImage;
  const date =
    (blog as { date?: string; publishedAt?: string }).date ??
    (blog as { publishedAt?: string }).publishedAt;

  return Response.json({
    blog: {
      id: blog.slug,
      slug: blog.slug,
      title: blog.title,
      excerpt: blog.excerpt ?? "",
      content: blog.content ?? "",
      image,
      coverImage: image,
      date,
      publishedAt: date,
      author: (blog as { author?: string }).author ?? "Sarjan Textiles",
    },
  });
}
