import { sendAdminTestPush } from "@/lib/admin-push-notifications";
import { getAdminRouteSession } from "@/lib/admin-route-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }

  try {
    await sendAdminTestPush(session.email);
    return Response.json({ ok: true, message: "Test push sent" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test push failed";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
