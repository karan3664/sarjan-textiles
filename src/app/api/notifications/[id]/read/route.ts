import { bearerToken, verifyClientToken } from "@/lib/client-token";
import {
  findClientNotification,
  markClientNotificationRead,
} from "@/lib/client-notifications";

/** POST /api/notifications/:id/read */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifyClientToken(bearerToken(request));
  if (!session) {
    return Response.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await findClientNotification(id);
  if (!existing) {
    return Response.json({ error: "Notification not found" }, { status: 404 });
  }

  const notification = await markClientNotificationRead(session.clientId, id);
  if (!notification) {
    return Response.json({ error: "Notification not found" }, { status: 404 });
  }
  return Response.json({ ok: true, notification });
}
