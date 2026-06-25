import type { AdminRole } from "@/lib/admin-token";
import type { AdminNotificationKind } from "@/lib/admin-notifications";
import {
  getAdminDeviceTokensForRoles,
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

export async function sendAdminStaffPush(input: AdminStaffPushInput) {
  const fcm = getFcm();
  if (!fcm) return;

  const roles = rolesForKind(input.kind);
  const tokens = await getAdminDeviceTokensForRoles(roles);
  if (!tokens.length) return;

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

  // Play Services shows the tray when the app is killed (RN HeadlessJS fails on MIUI).
  const response = await fcm.sendEachForMulticast({
    tokens,
    data,
    notification: {
      title: input.title,
      body: input.body,
    },
    android: {
      priority: "high",
      ttl: 3600 * 1000,
      notification: {
        title: input.title,
        body: input.body,
        channelId: "sarjan_admin_alerts",
        priority: "high" as const,
        defaultVibrateTimings: true,
        defaultSound: true,
        visibility: "public" as const,
      },
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

  if (response.failureCount > 0) {
    console.warn(
      "[admin-push] FCM failures:",
      response.responses
        .filter((item) => !item.success)
        .map((item) => item.error?.code ?? item.error?.message ?? "unknown"),
    );
  }
  console.info(
    `[admin-push] ${input.kind} → ${response.successCount}/${tokens.length} delivered`,
  );

  const stale = response.responses
    .map((item, index) =>
      item.success ||
      item.error?.code !== "messaging/registration-token-not-registered"
        ? null
        : tokens[index],
    )
    .filter((token): token is string => Boolean(token));
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
