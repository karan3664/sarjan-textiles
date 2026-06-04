import { getAdminRouteSession } from "@/lib/admin-route-session";

export async function GET(request: Request) {
  const admin = await getAdminRouteSession(request);
  if (!admin) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }
  return Response.json({ admin });
}
