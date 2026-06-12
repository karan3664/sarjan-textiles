import { bearerToken, verifyClientToken } from "@/lib/client-token";
import {
  recordAppEngagementEvent,
  type AppEngagementEventType,
} from "@/lib/app-engagement";
import { recordClientAppOpen } from "@/lib/client-activity";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EVENTS: AppEngagementEventType[] = [
  "install",
  "app_open",
  "session_start",
];

export async function POST(request: Request) {
  const session = await verifyClientToken(bearerToken(request));
  const limit = await rateLimit(
    rateLimitKey(request, "mobile-engagement", session?.clientId ?? "anon"),
    30,
    60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  try {
    const body = (await request.json()) as {
      event?: AppEngagementEventType;
      platform?: string;
      deviceId?: string;
      appVersion?: string;
      versionCode?: number;
    };

    const event = body.event;
    const deviceId = body.deviceId?.trim();
    const platform = body.platform?.trim() || "unknown";

    if (!event || !EVENTS.includes(event) || !deviceId) {
      return Response.json(
        { error: "Invalid engagement event." },
        { status: 400 },
      );
    }

    const result = await recordAppEngagementEvent({
      event,
      platform,
      deviceId,
      clientId: session?.clientId,
      appVersion: body.appVersion,
      versionCode: body.versionCode,
    });

    if (session?.clientId && event === "app_open") {
      await recordClientAppOpen(session.clientId).catch(() => null);
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to record event.",
      },
      { status: 500 },
    );
  }
}
