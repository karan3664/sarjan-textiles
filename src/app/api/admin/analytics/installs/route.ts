import { getAppInstallAnalytics } from "@/lib/app-engagement";
import { getAdminRouteSession } from "@/lib/admin-route-session";

function canView(role: string) {
  return role === "super_admin" || role === "admin" || role === "content";
}

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session || !canView(session.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analytics = await getAppInstallAnalytics();
  return Response.json(analytics);
}
