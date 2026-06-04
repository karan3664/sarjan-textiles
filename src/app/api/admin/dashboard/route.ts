import { getAdminDashboardData } from "@/lib/admin-dashboard";
import { getAdminRouteSession } from "@/lib/admin-route-session";

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }
  return Response.json(await getAdminDashboardData());
}
