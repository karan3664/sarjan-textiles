import {
  resetStudioPromptToDefault,
  updateStudioPrompt,
} from "@/lib/ai-product-studio";
import { requireAdminRouteSession } from "@/lib/require-admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireAdminRouteSession(request);
  if (session instanceof Response) return session;
  const body = await request.json().catch(() => ({}));

  if (body.resetToDefault === true) {
    const promptTemplate = await resetStudioPromptToDefault();
    return Response.json({ promptTemplate });
  }

  if (typeof body.promptTemplate !== "string") {
    return Response.json(
      { error: "Prompt template required" },
      { status: 400 },
    );
  }

  const promptTemplate = await updateStudioPrompt(body.promptTemplate);

  return Response.json({ promptTemplate });
}
