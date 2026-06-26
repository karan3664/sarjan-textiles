import type { AdminRole } from "@/lib/admin-token";
import type { AdminNotificationKind } from "@/lib/admin-notifications";
import {
  getAdminDeviceTokensForEmail,
  getAdminDeviceTokensForRolesByPlatform,
  removeAdminDeviceTokens,
} from "@/lib/admin-device-tokens";
import { getFcm } from "@/lib/firebase-admin";

function rolesForKind(kind: AdminNotificationKind): AdminRole[] | null {
  if (kind === "order") {
    return ["super_admin", "admin", "sales", "dispatch", "accounts"];
  }
  if (kind === "client") {
    return ["super_admin", "admin", "sales"];
  }
  if (kind === "comment" || kind === "inquiry") {
    return ["super_admin", "admin", "content", "sales"];
  }
  return null;
}

function screenForKind(kind: AdminNotificationKind): string {
  if (kind === "client") return "Customers";
  if (kind === "order") return "Orders";
  return "Dashboard";
}

export type AdminStaffPushInput = {
  kind: AdminNotificationKind;
  title: string;
  body: string;
  entityId: string;
  orderId?: string;
  clientId?: string;
  actionable?: boolean;
};

function buildData(input: AdminStaffPushInput): Record<string, string> {
  const data: Record<string, string> = {
    type: "admin_alert",
    kind: input.kind,
    entityId: input.entityId,
    screen: screenForKind(input.kind),
    actionable: input.actionable === false ? "false" : "true",
    title: input.title,
    body: input.body,
  };
  if (input.orderId) data.orderId = input.orderId;
  if (input.clientId) data.clientId = input.clientId;
  return data;
}

async function sendMulticast(
  label: string,
  tokens: string[],
  message: Parameters<
    NonNullable<ReturnType<typeof getFcm>>["sendEachForMulticast"]
  >[0],
) {
  const fcm = getFcm();
  if (!fcm || !tokens.length)
    return { successCount: 0, failureCount: 0, stale: [] as string[] };

  const response = await fcm.sendEachForMulticast({ ...message, tokens });

  if (response.failureCount > 0) {
    console.warn(
      `[admin-push] ${label} FCM failures:`,
      response.responses
        .filter((item) => !item.success)
        .map((item) => item.error?.code ?? item.error?.message ?? "unknown"),
    );
  }
  console.info(
    `[admin-push] ${label} → ${response.successCount}/${tokens.length} delivered`,
  );

  const stale = response.responses
    .map((item, index) =>
      item.success ||
      item.error?.code !== "messaging/registration-token-not-registered"
        ? null
        : tokens[index],
    )
    .filter((token): token is string => Boolean(token));

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    stale,
  };
}

export async function sendAdminStaffPush(input: AdminStaffPushInput) {
  const fcm = getFcm();
  if (!fcm) {
    console.warn("[admin-push] FCM not configured on server");
    return;
  }

  const roles = rolesForKind(input.kind);
  const { android, ios } = await getAdminDeviceTokensForRolesByPlatform(roles);
  if (!android.length && !ios.length) {
    console.warn(`[admin-push] No device tokens for kind=${input.kind}`, {
      roles,
    });
    return;
  }

  const data = buildData(input);
  const stale: string[] = [];

  // Android: data-only high priority → native SarjanAdminMessagingService shows tray.
  // Notification payload is skipped so onMessageReceived still runs when MIUI allows.
  if (android.length) {
    const result = await sendMulticast("android", android, {
      data,
      android: {
        priority: "high",
        ttl: 3600 * 1000,
      },
    });
    stale.push(...result.stale);
  }

  if (ios.length) {
    const result = await sendMulticast("ios", ios, {
      data,
      notification: {
        title: input.title,
        body: input.body,
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title: input.title,
              body: input.body,
            },
            sound: "zomato_ring_3.mp3",
            "content-available": 1,
            interruptionLevel: "timeSensitive",
          },
        },
      },
    });
    stale.push(...result.stale);
  }

  if (stale.length) {
    await removeAdminDeviceTokens(stale).catch(() => undefined);
  }
}

/** Sends a test alert only to the signed-in admin's registered devices. */
export async function sendAdminTestPush(email: string) {
  const fcm = getFcm();
  if (!fcm) {
    throw new Error("FCM not configured on server");
  }

  const { android, ios } = await getAdminDeviceTokensForEmail(email);
  if (!android.length && !ios.length) {
    throw new Error("No device token registered for your account");
  }

  const data = buildData({
    kind: "order",
    title: "Test admin alert",
    body: "If you see this, push notifications are working.",
    entityId: `test-${Date.now()}`,
    actionable: false,
  });
  const stale: string[] = [];

  if (android.length) {
    const result = await sendMulticast("android-test", android, {
      data,
      android: { priority: "high", ttl: 3600 * 1000 },
    });
    stale.push(...result.stale);
  }
  if (ios.length) {
    const result = await sendMulticast("ios-test", ios, {
      data,
      notification: {
        title: "Test admin alert",
        body: "If you see this, push notifications are working.",
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            alert: {
              title: "Test admin alert",
              body: "If you see this, push notifications are working.",
            },
            sound: "zomato_ring_3.mp3",
          },
        },
      },
    });
    stale.push(...result.stale);
  }

  if (stale.length) {
    await removeAdminDeviceTokens(stale).catch(() => undefined);
  }
}

export async function sendNewOrderAdminPush(order: {
  id: string;
  clientId: string;
  status: string;
  subtotal: number;
  clientName?: string;
}) {
  const client = order.clientName ?? "Client";
  await sendAdminStaffPush({
    kind: "order",
    title: "New order pending approval",
    body: `${client} · ${order.status} · ₹${Math.round(order.subtotal).toLocaleString("en-IN")}`,
    entityId: order.id,
    orderId: order.id,
    clientId: order.clientId,
    actionable: order.status === "Pending approval",
  });
}

export async function sendNewClientAdminPush(client: {
  id: string;
  companyName: string;
  email: string;
}) {
  await sendAdminStaffPush({
    kind: "client",
    title: "New client registration",
    body: `${client.companyName} · ${client.email}`,
    entityId: client.id,
    clientId: client.id,
    actionable: true,
  });
}
