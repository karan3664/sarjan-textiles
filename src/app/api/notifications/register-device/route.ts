import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { registerDeviceToken, type DevicePlatform } from "@/lib/device-tokens";

/**
 * POST /api/notifications/register-device
 * Body: { token: string, platform?: "android" | "ios" }
 * Auth: Bearer client JWT. Stores the device's FCM token against the client so
 * order notifications can be delivered to their phone(s).
 */
export async function POST(request: Request) {
  const session = await verifyClientToken(bearerToken(request));
  if (!session) {
    return Response.json(
      { error: "Valid client token required" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    platform?: unknown;
  } | null;

  const token = body?.token ? String(body.token).trim() : "";
  if (!token) {
    return Response.json({ error: "token required" }, { status: 400 });
  }
  const platform: DevicePlatform =
    String(body?.platform ?? "android").toLowerCase() === "ios"
      ? "ios"
      : "android";

  try {
    await registerDeviceToken({ clientId: session.clientId, token, platform });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to register device",
      },
      { status: 500 },
    );
  }
}
