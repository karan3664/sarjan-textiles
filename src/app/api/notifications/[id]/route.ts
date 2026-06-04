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
  const deleted = await deleteClientNotification(ownerId, id);
  if (!deleted) {
    return Response.json({ error: "Notification not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
