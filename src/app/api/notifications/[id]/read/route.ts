import { bearerToken, verifyClientToken } from "@/lib/client-token";
import {
  findClientNotification,
  isBroadcastNotification,
  markClientNotificationRead,
} from "@/lib/client-notifications";

/** POST /api/notifications/:id/read */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifyClientToken(bearerToken(request));
  const { id } = await params;
  const existing = await findClientNotification(id);
  if (!existing) {
    return Response.json({ error: "Notification not found" }, { status: 404 });
  }

  if (!session && !isBroadcastNotification(existing)) {
    return Response.json(
      { error: "Login required for account notifications" },
      { status: 401 },
    );
  }

  const ownerId = isBroadcastNotification(existing)
    ? existing.clientId
    : session!.clientId;
  const notification = await markClientNotificationRead(ownerId, id);
  if (!notification) {
    return Response.json({ error: "Notification not found" }, { status: 404 });
  }
  return Response.json({ ok: true, notification });
}
