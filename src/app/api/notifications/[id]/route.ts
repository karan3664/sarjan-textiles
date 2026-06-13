import { bearerToken, verifyClientToken } from "@/lib/client-token";
import {
  deleteClientNotification,
  findClientNotification,
  isBroadcastNotification,
} from "@/lib/client-notifications";

/** DELETE /api/notifications/:id — remove from inbox */
export async function DELETE(
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
  if (isBroadcastNotification(existing)) {
    return Response.json(
      { error: "Broadcast notifications cannot be deleted" },
      { status: 403 },
    );
  }

  const deleted = await deleteClientNotification(session.clientId, id);
  if (!deleted) {
    return Response.json({ error: "Notification not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
