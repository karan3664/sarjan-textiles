import { getAdminDeviceStatusForEmail } from "@/lib/admin-device-tokens";
import { getAdminRouteSession } from "@/lib/admin-route-session";
import { isPushConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }

  const devices = await getAdminDeviceStatusForEmail(session.email);

  return Response.json({
    pushConfigured: isPushConfigured(),
    email: session.email,
    role: session.role,
    deviceCount: devices.length,
    devices,
    hint:
      devices.length === 0
        ? "Open the admin app, allow notifications, then log in again."
        : null,
  });
}
