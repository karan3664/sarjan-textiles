import { updateStudioRecord } from "@/lib/ai-product-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (typeof body.id !== "string") {
    return Response.json({ error: "Image id required" }, { status: 400 });
  }

  if (!["approve", "reject", "reprocess", "delete", "catalog_shoot"].includes(body.action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const record = await updateStudioRecord({
      id: body.id,
      action: body.action,
      sku: typeof body.sku === "string" ? body.sku : undefined,
      note: typeof body.note === "string" ? body.note : undefined,
    });

    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Action failed" }, { status: 400 });
  }
}
