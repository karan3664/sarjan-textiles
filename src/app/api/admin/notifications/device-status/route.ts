import { getAdminDeviceStatusForEmail } from "@/lib/admin-device-tokens";
import { getAdminRouteSession } from "@/lib/admin-route-session";
import { isPushConfigured } from "@/lib/firebase-admin";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

export const runtime = "nodejs";

async function adminDeviceTokensTableReady(): Promise<boolean> {
  if (!isPostgresEnabled()) return true;
  try {
    await pgQuery("select 1 from admin_device_tokens limit 1");
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }

  const [devices, tableReady] = await Promise.all([
    getAdminDeviceStatusForEmail(session.email),
    adminDeviceTokensTableReady(),
  ]);

  return Response.json({
    pushConfigured: isPushConfigured(),
    tableReady,
    email: session.email,
    role: session.role,
    deviceCount: devices.length,
    devices,
    hint: !tableReady
      ? "admin_device_tokens table missing on THIS dev database — run migration on sarjan-dev-postgres / sarjan_dev."
      : devices.length === 0
        ? "Open the admin app, allow notifications, then log in again."
        : null,
  });
}
