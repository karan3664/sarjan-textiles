import { bearerToken, verifyClientToken } from "@/lib/client-token";
import {
  isBroadcastNotification,
  listBroadcastNotifications,
  listInboxForClient,
} from "@/lib/client-notifications";
import { localizeNotificationRecord } from "@/lib/notification-localize";
import { localeFromRequest } from "@/lib/request-locale";

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
  const locale = localeFromRequest(request);
  const session = await verifyClientToken(bearerToken(request));

  if (session) {
    const notifications = await listInboxForClient(session.clientId);
    return Response.json({
      notifications: notifications
        .map(toPublicNotification)
        .map((item) => localizeNotificationRecord(item, locale)),
      mode: "authenticated",
      locale,
    });
  }

  const notifications = await listBroadcastNotifications();
  return Response.json({
    notifications: notifications
      .map(toPublicNotification)
      .map((item) => localizeNotificationRecord(item, locale)),
    mode: "guest",
    locale,
  });
}
