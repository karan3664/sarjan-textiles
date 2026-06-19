import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/admin-token";
import { asStoredProducts } from "@/lib/cms-admin-view";
import {
  appendAuditLog,
  getCmsSnapshotForPatch,
  upsertCmsProducts,
} from "@/lib/cms-store";
import {
  applyBulkProductPatch,
  patchHasEnabledFields,
  type BulkProductPatch,
} from "@/lib/bulk-product-patch";
import {
  flattenProductForAdmin,
  flattenProductsForAdmin,
  localizeProductOnSave,
} from "@/lib/product-localize";
import { assertProductPriceValid } from "@/lib/product-pricing";

export const maxDuration = 120;
export const runtime = "nodejs";

type BulkPatchBody = {
  slugs?: string[];
  patch?: BulkProductPatch;
};

export async function PATCH(request: Request) {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as BulkPatchBody;
    const slugs = Array.isArray(body.slugs)
      ? body.slugs.map((slug) => String(slug).trim()).filter(Boolean)
      : [];
    const patch = body.patch;

    if (!slugs.length) {
      return Response.json(
        { error: "Select at least one product" },
        { status: 400 },
      );
    }
    if (!patch || !patchHasEnabledFields(patch)) {
      return Response.json(
        { error: "Enable at least one field to update" },
        { status: 400 },
      );
    }

    const cms = await getCmsSnapshotForPatch();
    const slugSet = new Set(slugs);
    const storedUpdates = [];
    const updatedSlugs: string[] = [];

    for (const previous of cms.products) {
      const current = flattenProductForAdmin(previous);
      if (!slugSet.has(current.slug)) continue;

      const patched = applyBulkProductPatch(current, patch);
      const localized = await localizeProductOnSave(patched, previous);
      const stored = asStoredProducts([localized])[0]!;
      assertProductPriceValid(stored);
      storedUpdates.push(stored);
      updatedSlugs.push(current.slug);
    }

    if (!storedUpdates.length) {
      return Response.json(
        { error: "No matching products found" },
        { status: 404 },
      );
    }

    await upsertCmsProducts(storedUpdates, cms);
    void appendAuditLog({
      actor: session.email,
      role: session.role,
      action: "bulk_patch_products",
      entity: "product",
      note: `${updatedSlugs.length} products: ${updatedSlugs.slice(0, 5).join(", ")}${updatedSlugs.length > 5 ? "…" : ""}`,
    }).catch(() => null);

    return Response.json({
      ok: true,
      count: updatedSlugs.length,
      slugs: updatedSlugs,
      products: flattenProductsForAdmin(storedUpdates),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bulk product update failed";
    console.error("[cms/products/bulk PATCH]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
