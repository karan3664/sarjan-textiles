import { processStudioImages } from "@/lib/ai-product-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let processing = false;

export async function POST(request: Request) {
  if (processing) {
    return Response.json({ error: "AI processing already running. Wait for current batch to finish." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string") : undefined;
  const requestedLimit = Number(body.limit);
  const limit = ids?.length ? ids.length : Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 3;

  try {
    processing = true;
    const result = await processStudioImages(ids, limit);
    return Response.json(result);
  } finally {
    processing = false;
  }
}
