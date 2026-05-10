import { randomUUID } from "crypto";
import { deleteClientPricingRule, getCmsSnapshot, upsertClientPricingRule } from "@/lib/cms-store";

export async function GET() {
  const cms = await getCmsSnapshot();
  return Response.json({ pricing: cms.clientPricing, products: cms.products });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.clientId || !body.productSlug) return Response.json({ error: "Client and product required" }, { status: 400 });
    const customPrice = body.customPrice === "" || body.customPrice === undefined ? undefined : Number(body.customPrice);
    const discountPercentage = body.discountPercentage === "" || body.discountPercentage === undefined ? undefined : Number(body.discountPercentage);

    const cms = await upsertClientPricingRule({
      id: body.id || randomUUID(),
      clientId: String(body.clientId),
      productSlug: String(body.productSlug),
      customPrice: Number.isFinite(customPrice) ? customPrice : undefined,
      discountPercentage: Number.isFinite(discountPercentage) ? discountPercentage : undefined,
      validFrom: body.validFrom || undefined,
      validTo: body.validTo || undefined,
      active: body.active !== false,
      note: body.note || undefined,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ pricing: cms.clientPricing });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pricing save failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Rule id required" }, { status: 400 });
  const cms = await deleteClientPricingRule(id);
  return Response.json({ pricing: cms.clientPricing });
}
