import type { AdminRole } from "@/lib/admin-token";
import {
  getAdminDeviceTokensForEmail,
  getAdminDeviceTokensForRolesByPlatform,
  removeAdminDeviceTokens,
} from "@/lib/admin-device-tokens";
import { getFcm } from "@/lib/firebase-admin";

/** FCM `kind` values — must match admin app `LiveEventKind`. */
export type AdminLivePushKind =
  | "order"
  | "client"
  | "inquiry"
  | "newsletter"
  | "payment_uploaded"
  | "payment_approved"
  | "dispatch_pending"
  | "stock_low"
  | "stock_out"
  | "review"
  | "ai_lead"
  | "ai_lead_high"
  | "support_ticket"
  | "server_alert"
  | "broadcast"
  | "comment";

export type AdminStaffPushInput = {
  kind: AdminLivePushKind;
  title: string;
  body: string;
  entityId: string;
  orderId?: string;
  clientId?: string;
  actionable?: boolean;
  priority?: "critical" | "medium" | "low";
  channelId?: string;
};

const CRITICAL_KINDS = new Set<AdminLivePushKind>([
  "order",
  "payment_uploaded",
  "payment_approved",
  "dispatch_pending",
  "ai_lead_high",
]);

const LOW_KINDS = new Set<AdminLivePushKind>(["newsletter"]);

function priorityForKind(
  kind: AdminLivePushKind,
): "critical" | "medium" | "low" {
  if (CRITICAL_KINDS.has(kind)) return "critical";
  if (LOW_KINDS.has(kind)) return "low";
  return "medium";
}

function channelForPriority(priority: "critical" | "medium" | "low"): string {
  return priority === "critical" ? "sarjan_admin_alerts" : "sarjan_default";
}

function rolesForKind(kind: AdminLivePushKind): AdminRole[] | null {
  switch (kind) {
    case "order":
    case "dispatch_pending":
      return ["super_admin", "admin", "sales", "dispatch", "accounts"];
    case "client":
      return ["super_admin", "admin", "sales"];
    case "payment_uploaded":
    case "payment_approved":
      return ["super_admin", "admin", "accounts"];
    case "stock_low":
    case "stock_out":
      return ["super_admin", "admin", "dispatch", "sales"];
    case "comment":
    case "inquiry":
    case "newsletter":
    case "review":
      return ["super_admin", "admin", "content", "sales"];
    case "ai_lead":
    case "ai_lead_high":
      return ["super_admin", "admin", "sales"];
    case "broadcast":
    case "server_alert":
    case "support_ticket":
      return null;
    default:
      return null;
  }
}

function screenForKind(kind: AdminLivePushKind): string {
  const map: Partial<Record<AdminLivePushKind, string>> = {
    client: "Customers",
    order: "Orders",
    inquiry: "Inquiries",
    payment_uploaded: "Payments",
    payment_approved: "Payments",
    dispatch_pending: "Dispatch",
    stock_low: "Inventory",
    stock_out: "Inventory",
    review: "CommerceHub",
    ai_lead: "Inquiries",
    ai_lead_high: "Inquiries",
    broadcast: "Inbox",
    comment: "CommerceHub",
    newsletter: "CommerceHub",
    support_ticket: "Inbox",
    server_alert: "Dashboard",
  };
  return map[kind] ?? "Dashboard";
}

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

  const priority = input.priority ?? priorityForKind(input.kind);
  const channelId = input.channelId ?? channelForPriority(priority);
  const androidPriority = priority === "critical" ? "high" : "normal";

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

  if (android.length) {
    const result = await sendMulticast(`android:${input.kind}`, android, {
      data,
      notification: {
        title: input.title,
        body: input.body,
      },
      android: {
        priority: androidPriority,
        ttl: 3600 * 1000,
        notification: {
          title: input.title,
          body: input.body,
          channelId,
          priority: androidPriority === "high" ? "high" : "default",
          defaultVibrateTimings: priority !== "low",
          defaultSound: priority !== "low",
          visibility: "public" as const,
        },
      },
    });
    stale.push(...result.stale);
  }

  if (ios.length) {
    const result = await sendMulticast(`ios:${input.kind}`, ios, {
      data,
      notification: {
        title: input.title,
        body: input.body,
      },
      apns: {
        headers: {
          "apns-priority": priority === "critical" ? "10" : "5",
        },
        payload: {
          aps: {
            alert: {
              title: input.title,
              body: input.body,
            },
            sound: priority === "low" ? undefined : "zomato_ring_3.mp3",
            "content-available": 1,
            interruptionLevel:
              priority === "critical" ? "timeSensitive" : "active",
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

/** Fire-and-forget — never block HTTP handlers. */
export function pushAdminLiveEvent(input: AdminStaffPushInput): void {
  void sendAdminStaffPush(input).catch((error) => {
    console.error(`[admin-push] kind=${input.kind} failed`, error);
  });
}

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
      notification: {
        title: "Test admin alert",
        body: "If you see this, push notifications are working.",
      },
      android: {
        priority: "high",
        ttl: 3600 * 1000,
        notification: {
          title: "Test admin alert",
          body: "If you see this, push notifications are working.",
          channelId: "sarjan_admin_alerts",
          priority: "high" as const,
          defaultVibrateTimings: true,
          defaultSound: true,
          visibility: "public" as const,
        },
      },
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
  pushAdminLiveEvent({
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
  pushAdminLiveEvent({
    kind: "client",
    title: "New client registration",
    body: `${client.companyName} · ${client.email}`,
    entityId: client.id,
    clientId: client.id,
    actionable: true,
  });
}

export function sendInquiryAdminPush(inquiry: {
  id: string;
  companyName: string;
  email: string;
  message: string;
}) {
  const preview =
    inquiry.message.replace(/\s+/g, " ").trim().slice(0, 80) +
    (inquiry.message.length > 80 ? "…" : "");
  pushAdminLiveEvent({
    kind: "inquiry",
    title: "Contact inquiry",
    body: `${inquiry.companyName || inquiry.email} — ${preview}`,
    entityId: inquiry.id,
    actionable: true,
  });
}

export function sendNewsletterAdminPush(subscriber: {
  email: string;
  source?: string;
}) {
  pushAdminLiveEvent({
    kind: "newsletter",
    title: "Newsletter signup",
    body: `${subscriber.email}${subscriber.source ? ` · ${subscriber.source}` : ""}`,
    entityId: subscriber.email,
    actionable: false,
    priority: "low",
  });
}

export function sendReviewSubmittedAdminPush(review: {
  id: string;
  clientName: string;
  productSlug: string;
  rating: number;
}) {
  pushAdminLiveEvent({
    kind: "review",
    title: "Review submitted",
    body: `${review.clientName} · ${review.rating}★ · ${review.productSlug}`,
    entityId: review.id,
    actionable: false,
  });
}

export function sendBlogCommentAdminPush(comment: {
  id: string;
  authorName: string;
  blogSlug: string;
  body: string;
}) {
  const preview =
    comment.body.replace(/\s+/g, " ").trim().slice(0, 70) +
    (comment.body.length > 70 ? "…" : "");
  pushAdminLiveEvent({
    kind: "comment",
    title: "Blog comment pending",
    body: `${comment.authorName} on ${comment.blogSlug}: ${preview}`,
    entityId: comment.id,
    actionable: false,
  });
}

export function sendPaymentUploadedAdminPush(order: {
  id: string;
  clientName?: string;
  paidAmount?: number;
}) {
  pushAdminLiveEvent({
    kind: "payment_uploaded",
    title: "Payment uploaded",
    body: `${order.clientName ?? "Client"} · Order ${order.id}${order.paidAmount ? ` · ₹${Math.round(order.paidAmount).toLocaleString("en-IN")}` : ""}`,
    entityId: order.id,
    orderId: order.id,
    actionable: true,
  });
}

export function sendPaymentApprovedAdminPush(order: {
  id: string;
  clientName?: string;
  paidAmount?: number;
}) {
  pushAdminLiveEvent({
    kind: "payment_approved",
    title: "Payment approved",
    body: `${order.clientName ?? "Client"} · Order ${order.id}`,
    entityId: order.id,
    orderId: order.id,
    actionable: false,
  });
}

export function sendDispatchPendingAdminPush(order: {
  id: string;
  clientName?: string;
  subtotal?: number;
}) {
  pushAdminLiveEvent({
    kind: "dispatch_pending",
    title: "Dispatch pending",
    body: `${order.clientName ?? "Client"} · Order ${order.id}`,
    entityId: order.id,
    orderId: order.id,
    actionable: true,
  });
}

export function sendStockLowAdminPush(product: {
  slug: string;
  name: string;
  stock: number;
}) {
  pushAdminLiveEvent({
    kind: "stock_low",
    title: "Stock low",
    body: `${product.name} · ${product.stock} left`,
    entityId: product.slug,
    actionable: false,
  });
}

export function sendStockOutAdminPush(product: { slug: string; name: string }) {
  pushAdminLiveEvent({
    kind: "stock_out",
    title: "Out of stock",
    body: product.name,
    entityId: product.slug,
    actionable: false,
  });
}

export function sendAiLeadAdminPush(lead: {
  id: string;
  clientId?: string;
  productInterest?: string | null;
  budgetInr?: number | null;
  intentType?: string | null;
  highPriority?: boolean;
}) {
  const high =
    lead.highPriority ||
    (lead.budgetInr != null && lead.budgetInr >= 50000) ||
    lead.intentType === "abandoned_cart";
  const kind: AdminLivePushKind = high ? "ai_lead_high" : "ai_lead";
  pushAdminLiveEvent({
    kind,
    title: high ? "High priority AI lead" : "AI lead generated",
    body: [
      lead.productInterest?.trim() || "Purchase intent",
      lead.budgetInr
        ? `₹${Math.round(lead.budgetInr).toLocaleString("en-IN")}`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
    entityId: lead.id,
    clientId: lead.clientId,
    actionable: true,
  });
}

export function sendAdminBroadcastPush(input: {
  id: string;
  title: string;
  body: string;
}) {
  pushAdminLiveEvent({
    kind: "broadcast",
    title: input.title,
    body: input.body,
    entityId: input.id,
    actionable: false,
  });
}

export function sendServerAlertAdminPush(input: {
  id: string;
  title: string;
  body: string;
}) {
  pushAdminLiveEvent({
    kind: "server_alert",
    title: input.title,
    body: input.body,
    entityId: input.id,
    actionable: false,
  });
}
