import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { deleteClientNotification } from "@/lib/client-notifications";

/** DELETE /api/notifications/:id — remove from inbox */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifyClientToken(bearerToken(request));
  if (!session) {
    return Response.json(
      { error: "Valid client token required" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const deleted = await deleteClientNotification(session.clientId, id);
  if (!deleted) {
    return Response.json({ error: "Notification not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
