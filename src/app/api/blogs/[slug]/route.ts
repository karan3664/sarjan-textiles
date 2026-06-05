import { getCmsBlogBySlug } from "@/lib/cms-store";
import { resolveBlog } from "@/lib/content-localize";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";

export const revalidate = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const locale = localeFromRequest(request);
  const { slug } = await params;

  const blog = await getCmsBlogBySlug(slug);
  if (!blog) {
    return Response.json({ error: "Blog not found" }, { status: 404 });
  }

  const localized = resolveBlog(blog, locale);
  const image =
    (localized as { image?: string; coverImage?: string }).image ??
    (localized as { coverImage?: string }).coverImage;
  const date =
    (localized as { date?: string; publishedAt?: string }).date ??
    (localized as { publishedAt?: string }).publishedAt;

  return jsonLocalized(
    {
      blog: {
        id: localized.slug,
        slug: localized.slug,
        title: localized.title,
        excerpt: localized.excerpt ?? "",
        content: localized.content ?? "",
        image,
        coverImage: image,
        date,
        publishedAt: date,
        author: (localized as { author?: string }).author ?? "Sarjan Textiles",
      },
      locale,
    },
    locale,
  );
}
