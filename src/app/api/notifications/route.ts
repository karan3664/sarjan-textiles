import { bearerToken, verifyClientToken } from "@/lib/client-token";
import {
  isBroadcastNotification,
  listBroadcastNotifications,
  listInboxForClient,
} from "@/lib/client-notifications";

function toPublicNotification(
  item: Awaited<ReturnType<typeof listBroadcastNotifications>>[number],
) {
  const { clientId: _clientId, ...rest } = item;
  return {
    ...rest,
    audience: isBroadcastNotification(item) ? "broadcast" : "client",
  };
}

/** GET /api/notifications — inbox (logged-in: orders + offers; guest: broadcasts only). */
export async function GET(request: Request) {
  const session = await verifyClientToken(bearerToken(request));

  if (session) {
    const notifications = await listInboxForClient(session.clientId);
    return Response.json({
      notifications: notifications.map(toPublicNotification),
      mode: "authenticated",
    });
  }

  const notifications = await listBroadcastNotifications();
  return Response.json({
    notifications: notifications.map(toPublicNotification),
    mode: "guest",
  });
}
