import { deleteCmsBlog, upsertCmsBlog } from "@/lib/cms-store";

export async function POST(request: Request) {
  const blog = await request.json();
  return Response.json(await upsertCmsBlog(blog));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return Response.json({ error: "Blog slug required" }, { status: 400 });
  return Response.json(await deleteCmsBlog(slug));
}
