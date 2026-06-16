import { bearerToken, verifyClientToken } from "@/lib/client-token";
import {
  isBroadcastNotification,
  listInboxForClient,
} from "@/lib/client-notifications";
import { localizeNotificationRecord } from "@/lib/notification-localize";
import { localeFromRequest } from "@/lib/request-locale";

function toPublicNotification(
  item: Awaited<ReturnType<typeof listInboxForClient>>[number],
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

  const notifications = session
    ? await listInboxForClient(session.clientId)
    : [];
  return Response.json({
    notifications: session
      ? notifications
          .map(toPublicNotification)
          .map((item) => localizeNotificationRecord(item, locale))
      : [],
    mode: session ? "authenticated" : "guest",
    locale,
  });
}
