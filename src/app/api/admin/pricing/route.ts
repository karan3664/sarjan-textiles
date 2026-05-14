import { randomUUID } from "crypto";
import { appendAuditLog, deleteClientPricingRule, getCmsSnapshot, upsertClientPricingRule, type ClientPricingRule } from "@/lib/cms-store";
import { verifyAdminToken } from "@/lib/admin-token";
import { cookies } from "next/headers";

export async function GET() {
  const cms = await getCmsSnapshot();
  return Response.json({ pricing: cms.clientPricing, products: cms.products });
}

export async function POST(request: Request) {
  try {
    const session = await verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
    if (!session) return Response.json({ error: "Admin login required" }, { status: 401 });
    const body = await request.json();
    const scope: ClientPricingRule["scope"] = body.scope === "category" ? "category" : "product";
    const categoryPath = Array.isArray(body.categoryPath)
      ? body.categoryPath.map((item: unknown) => String(item).trim()).filter(Boolean)
      : String(body.categoryPath ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    const productSlug = String(body.productSlug ?? "").trim();
    if (!body.clientId || (scope === "product" && !productSlug) || (scope === "category" && !categoryPath.length)) {
      return Response.json({ error: "Client and product/category required" }, { status: 400 });
    }
    const customPrice = body.customPrice === "" || body.customPrice === undefined ? undefined : Number(body.customPrice);
    const discountPercentage = body.discountPercentage === "" || body.discountPercentage === undefined ? undefined : Number(body.discountPercentage);

    const current = await getCmsSnapshot();
    const previous = body.id ? current.clientPricing.find((rule) => rule.id === body.id) : undefined;
    const updatedAt = new Date().toISOString();
    const rule: ClientPricingRule = {
      id: body.id || randomUUID(),
      clientId: String(body.clientId),
      scope,
      productSlug: scope === "product" ? productSlug : undefined,
      categoryPath: scope === "category" ? categoryPath : undefined,
      customPrice: Number.isFinite(customPrice) ? customPrice : undefined,
      discountPercentage: Number.isFinite(discountPercentage) ? discountPercentage : undefined,
      validFrom: body.validFrom || undefined,
      validTo: body.validTo || undefined,
      active: body.active !== false,
      note: body.note || undefined,
      updatedAt,
      history: [
        {
          customPrice: Number.isFinite(customPrice) ? customPrice : undefined,
          discountPercentage: Number.isFinite(discountPercentage) ? discountPercentage : undefined,
          scope,
          productSlug: scope === "product" ? productSlug : undefined,
          categoryPath: scope === "category" ? categoryPath : undefined,
          validFrom: body.validFrom || undefined,
          validTo: body.validTo || undefined,
          active: body.active !== false,
          note: body.note || undefined,
          updatedAt,
          actor: session.email,
        },
        ...(previous?.history ?? []),
      ].slice(0, 20),
    };
    const cms = await upsertClientPricingRule(rule);
    await appendAuditLog({ actor: session.email, role: session.role, action: previous ? "update_pricing_rule" : "create_pricing_rule", entity: "client_pricing", entityId: rule.id, before: previous, after: rule, note: rule.note }).catch(() => null);
    return Response.json({ pricing: cms.clientPricing });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pricing save failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
  if (!session) return Response.json({ error: "Admin login required" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Rule id required" }, { status: 400 });
  const before = (await getCmsSnapshot()).clientPricing.find((rule) => rule.id === id);
  const cms = await deleteClientPricingRule(id);
  await appendAuditLog({ actor: session.email, role: session.role, action: "delete_pricing_rule", entity: "client_pricing", entityId: id, before }).catch(() => null);
  return Response.json({ pricing: cms.clientPricing });
}
