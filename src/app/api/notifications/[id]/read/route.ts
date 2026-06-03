import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { markClientNotificationRead } from "@/lib/client-notifications";

/** POST /api/notifications/:id/read */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifyClientToken(bearerToken(_request));
  if (!session) {
    return Response.json(
      { error: "Valid client token required" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const notification = await markClientNotificationRead(session.clientId, id);
  if (!notification) {
    return Response.json({ error: "Notification not found" }, { status: 404 });
  }
  return Response.json({ ok: true, notification });
}
