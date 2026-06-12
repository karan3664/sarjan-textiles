import { getSentryCrashSummary } from "@/lib/sentry-admin";
import { getAdminRouteSession } from "@/lib/admin-route-session";

function canView(role: string) {
  return role === "super_admin" || role === "admin";
}

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session || !canView(session.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getSentryCrashSummary();
  return Response.json(summary);
}
