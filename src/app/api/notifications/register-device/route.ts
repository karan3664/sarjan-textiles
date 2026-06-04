import { bearerToken, verifyClientToken } from "@/lib/client-token";
import {
  registerAnonymousDeviceToken,
  registerDeviceToken,
  type DevicePlatform,
} from "@/lib/device-tokens";

/**
 * POST /api/notifications/register-device
 * Body: { token: string, platform?: "android" | "ios" }
 * Auth optional: logged-in clients link token to account; guests register for promos.
 */
export async function POST(request: Request) {
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

  const session = await verifyClientToken(bearerToken(request));

  try {
    if (session) {
      await registerDeviceToken({
        clientId: session.clientId,
        token,
        platform,
      });
      return Response.json({ ok: true, mode: "authenticated" });
    }
    await registerAnonymousDeviceToken({ token, platform });
    return Response.json({ ok: true, mode: "guest" });
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
