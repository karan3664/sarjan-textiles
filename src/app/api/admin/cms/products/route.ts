import { appendAuditLog, deleteCmsProduct, upsertCmsProduct, upsertCmsProducts } from "@/lib/cms-store";
import { verifyAdminToken } from "@/lib/admin-token";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const session = await verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
  if (!session) return Response.json({ error: "Admin login required" }, { status: 401 });
  const product = await request.json();
  if (Array.isArray(product.products)) {
    const result = await upsertCmsProducts(product.products);
    await appendAuditLog({ actor: session.email, role: session.role, action: "bulk_upsert_products", entity: "product", note: `${product.products.length} products` }).catch(() => null);
    return Response.json(result);
  }
  const result = await upsertCmsProduct(product);
  await appendAuditLog({ actor: session.email, role: session.role, action: "upsert_product", entity: "product", entityId: product.slug || product.id, after: product }).catch(() => null);
  return Response.json(result);
}

export async function DELETE(request: Request) {
  const session = await verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
  if (!session) return Response.json({ error: "Admin login required" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return Response.json({ error: "Product slug required" }, { status: 400 });
  const result = await deleteCmsProduct(slug);
  await appendAuditLog({ actor: session.email, role: session.role, action: "delete_product", entity: "product", entityId: slug }).catch(() => null);
  return Response.json(result);
}
