import { registerAdminDeviceToken } from "@/lib/admin-device-tokens";
import { getAdminRouteSession } from "@/lib/admin-route-session";
import type { DevicePlatform } from "@/lib/device-tokens";

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

  const platformRaw =
    typeof body === "object" && body && "platform" in body
      ? String((body as Record<string, unknown>).platform ?? "android")
      : "android";
  const platform: DevicePlatform = platformRaw === "ios" ? "ios" : "android";

  try {
    await registerAdminDeviceToken({
      adminEmail: session.email,
      adminRole: session.role,
      token,
      platform,
    });
  } catch (error) {
    console.error("Admin device token registration failed", error);
    const raw = error instanceof Error ? error.message : "";
    const message =
      raw.includes("admin_device_tokens") || raw.includes("does not exist")
        ? "Push token storage is not ready. Apply the admin_device_tokens database migration on dev."
        : raw || "Could not save device token";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ ok: true, email: session.email, role: session.role });
}
