import { getClientActivityAnalytics } from "@/lib/client-activity";
import { getAdminRouteSession } from "@/lib/admin-route-session";

function canView(role: string) {
  return role === "super_admin" || role === "admin" || role === "content";
}

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session || !canView(session.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analytics = await getClientActivityAnalytics();
  return Response.json(analytics);
}
