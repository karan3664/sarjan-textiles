import { removeAdminDeviceTokens } from "@/lib/admin-device-tokens";
import { getAdminRouteSession } from "@/lib/admin-route-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token =
    typeof body === "object" && body && "token" in body
      ? String((body as Record<string, unknown>).token ?? "").trim()
      : "";
  if (!token) {
    return Response.json({ error: "FCM token required" }, { status: 400 });
  }

  try {
    await removeAdminDeviceTokens([token]);
  } catch (error) {
    console.error("Admin device token unregister failed", error);
    return Response.json(
      { error: "Could not remove device token" },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
