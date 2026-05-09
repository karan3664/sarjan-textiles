import { deleteCmsProduct, upsertCmsProduct } from "@/lib/cms-store";

export async function POST(request: Request) {
  const product = await request.json();
  return Response.json(await upsertCmsProduct(product));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return Response.json({ error: "Product slug required" }, { status: 400 });
  return Response.json(await deleteCmsProduct(slug));
}
