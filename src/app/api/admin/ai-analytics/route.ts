import { requireAdminRouteSession } from "@/lib/require-admin-session";
import { getAiAnalyticsSummary } from "@/lib/ai-chat/store";

export async function GET(request: Request) {
  const session = await requireAdminRouteSession(request, {
    roles: ["super_admin", "admin"],
  });
  if (session instanceof Response) return session;

  const summary = await getAiAnalyticsSummary(30);
  return Response.json(summary);
}
