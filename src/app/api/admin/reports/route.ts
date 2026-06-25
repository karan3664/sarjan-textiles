import { getAdminReportsData } from "@/lib/admin-reports";
import { getAdminRouteSession } from "@/lib/admin-route-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }
  return Response.json(await getAdminReportsData());
}
