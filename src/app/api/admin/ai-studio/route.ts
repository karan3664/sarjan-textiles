import { getStudioSnapshot } from "@/lib/ai-product-studio";
import { requireAdminRouteSession } from "@/lib/require-admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireAdminRouteSession(request);
  if (session instanceof Response) return session;
  try {
    return Response.json(await getStudioSnapshot());
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "AI studio snapshot failed",
      },
      { status: 500 },
    );
  }
}
