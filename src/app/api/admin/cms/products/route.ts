import {
  appendAuditLog,
  deleteCmsProduct,
  getCmsSnapshotForPatch,
  upsertCmsProduct,
  upsertCmsProducts,
} from "@/lib/cms-store";
import { verifyAdminToken } from "@/lib/admin-token";
import { readEnglish } from "@/lib/cms-localize";
import {
  flattenProductForAdmin,
  localizeProductOnSave,
  localizeProductsOnSaveFast,
} from "@/lib/product-localize";
import { asStoredProducts } from "@/lib/cms-admin-view";
import { assertProductPriceValid } from "@/lib/product-pricing";
import { cookies } from "next/headers";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session)
    return Response.json({ error: "Admin login required" }, { status: 401 });

  try {
    const cms = await getCmsSnapshotForPatch();
    const product = await request.json();

    if (Array.isArray(product.products)) {
      const localized = localizeProductsOnSaveFast(product.products);
      const stored = asStoredProducts(localized);
      for (const item of stored) assertProductPriceValid(item);
      await upsertCmsProducts(stored, cms);
      void appendAuditLog({
        actor: session.email,
        role: session.role,
        action: "bulk_upsert_products",
        entity: "product",
        note: `${stored.length} products`,
      }).catch(() => null);
      return Response.json({
        ok: true,
        count: stored.length,
        slugs: stored.map((item) => item.slug),
      });
    }

    const previous = cms.products.find(
      (item) =>
        item.slug === product.slug ||
        item.id === product.id ||
        readEnglish(item.name) === readEnglish(product.name),
    );
    const localized = await localizeProductOnSave(product, previous);
    const stored = asStoredProducts([localized])[0]!;
    assertProductPriceValid(stored);
    await upsertCmsProduct(stored, cms);
    void appendAuditLog({
      actor: session.email,
      role: session.role,
      action: "upsert_product",
      entity: "product",
      entityId: product.slug || product.id,
      note: stored.slug,
    }).catch(() => null);
    return Response.json({
      ok: true,
      product: flattenProductForAdmin(localized),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Product save failed";
    console.error("[cms/products POST]", error);
    return Response.json({ error: message }, { status: 500 });
  }
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
  await deleteCmsProduct(slug);
  void appendAuditLog({
    actor: session.email,
    role: session.role,
    action: "delete_product",
    entity: "product",
    entityId: slug,
  }).catch(() => null);
  return Response.json({ ok: true, slug });
}
