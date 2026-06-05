import {
  appendAuditLog,
  deleteCmsProduct,
  getCmsSnapshot,
  upsertCmsProduct,
  upsertCmsProducts,
} from "@/lib/cms-store";
import { verifyAdminToken } from "@/lib/admin-token";
import { readEnglish } from "@/lib/cms-localize";
import {
  flattenProductForAdmin,
  flattenProductsForAdmin,
  localizeProductOnSave,
  localizeProductsOnSave,
} from "@/lib/product-localize";
import { asStoredProducts } from "@/lib/cms-admin-view";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session)
    return Response.json({ error: "Admin login required" }, { status: 401 });
  const cms = await getCmsSnapshot();
  const product = await request.json();

  if (Array.isArray(product.products)) {
    const localized = await localizeProductsOnSave(product.products);
    const result = await upsertCmsProducts(asStoredProducts(localized));
    await appendAuditLog({
      actor: session.email,
      role: session.role,
      action: "bulk_upsert_products",
      entity: "product",
      note: `${product.products.length} products`,
    }).catch(() => null);
    return Response.json({
      ...result,
      products: flattenProductsForAdmin(result.products),
    });
  }

  const previous = cms.products.find(
    (item) =>
      item.slug === product.slug ||
      item.id === product.id ||
      readEnglish(item.name) === readEnglish(product.name),
  );
  const localized = await localizeProductOnSave(product, previous);
  const result = await upsertCmsProduct(asStoredProducts([localized])[0]!);
  await appendAuditLog({
    actor: session.email,
    role: session.role,
    action: "upsert_product",
    entity: "product",
    entityId: product.slug || product.id,
    after: flattenProductForAdmin(localized),
  }).catch(() => null);
  return Response.json({
    ...result,
    products: flattenProductsForAdmin(result.products),
  });
}

export async function DELETE(request: Request) {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session)
    return Response.json({ error: "Admin login required" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug)
    return Response.json({ error: "Product slug required" }, { status: 400 });
  const result = await deleteCmsProduct(slug);
  await appendAuditLog({
    actor: session.email,
    role: session.role,
    action: "delete_product",
    entity: "product",
    entityId: slug,
  }).catch(() => null);
  return Response.json({
    ...result,
    products: flattenProductsForAdmin(result.products),
  });
}
