import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { listClientNotifications } from "@/lib/client-notifications";

/** GET /api/notifications — inbox for the signed-in client. */
export async function GET(request: Request) {
  const session = await verifyClientToken(bearerToken(request));
  if (!session) {
    return Response.json(
      { error: "Valid client token required" },
      { status: 401 },
    );
  }

  const notifications = await listClientNotifications(session.clientId);
  return Response.json({ notifications });
}
