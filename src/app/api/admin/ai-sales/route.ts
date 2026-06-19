import { requireAdminRouteSession } from "@/lib/require-admin-session";
import { getAiSalesAnalytics } from "@/lib/ai-sales/leads";

export async function GET(request: Request) {
  const session = await requireAdminRouteSession(request, {
    roles: ["super_admin", "admin"],
  });
  if (session instanceof Response) return session;

  const summary = await getAiSalesAnalytics(40);
  return Response.json(summary);
}
