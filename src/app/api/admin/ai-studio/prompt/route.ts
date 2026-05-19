import { updateStudioPrompt } from "@/lib/ai-product-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (typeof body.promptTemplate !== "string") {
    return Response.json({ error: "Prompt template required" }, { status: 400 });
  }

  const promptTemplate = await updateStudioPrompt(body.promptTemplate);

  return Response.json({ promptTemplate });
}
