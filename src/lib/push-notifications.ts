import {
  createBroadcastNotification,
  createClientNotification,
  type ClientNotificationRecord,
} from "@/lib/client-notifications";
import {
  getAllPushDeviceTokens,
  getClientDeviceTokens,
  removeDeviceTokens,
} from "@/lib/device-tokens";
import { getFcm } from "@/lib/firebase-admin";
import type { LocalOrder } from "@/lib/local-db";

function formatInr(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

/** Customer-facing copy for each order status that should notify the buyer. */
const statusCopy: Partial<
  Record<
    LocalOrder["status"],
    { title: string; body: (o: LocalOrder) => string }
  >
> = {
  "Pending approval": {
    title: "Order received",
    body: (o) =>
      `Order ${o.id} is received and pending approval (${formatInr(o.subtotal)}).`,
  },
  Approved: {
    title: "Order approved ✅",
    body: (o) => `Great news! Order ${o.id} has been approved.`,
  },
  "Partially Approved": {
    title: "Order partially approved",
    body: (o) =>
      `Order ${o.id} is partially approved. Our team will confirm production for the remaining quantity.`,
  },
  "In Production": {
    title: "Order in production 🧵",
    body: (o) => `Order ${o.id} is now being produced.`,
  },
  Packed: {
    title: "Order packed 📦",
    body: (o) => `Order ${o.id} is packed and getting ready to ship.`,
  },
  "Ready for Dispatch": {
    title: "Ready for dispatch 🚚",
    body: (o) => `Order ${o.id} is ready for dispatch.`,
  },
  Dispatched: {
    title: "Order dispatched 🚚",
    body: (o) =>
      o.lrNumber
        ? `Order ${o.id} dispatched. LR: ${o.lrNumber}.`
        : `Order ${o.id} has been dispatched.`,
  },
  Delivered: {
    title: "Order delivered 🎉",
    body: (o) =>
      `Order ${o.id} has been delivered. Please rate your purchase when you have a moment.`,
  },
  Rejected: {
    title: "Order update",
    body: (o) =>
      o.approvalRemark
        ? `Order ${o.id} could not be approved: ${o.approvalRemark}`
        : `Order ${o.id} could not be approved. Please contact us.`,
  },
};

async function pushToClient(
  clientId: string,
  message: {
    title: string;
    body: string;
    type: ClientNotificationRecord["type"];
    data: Record<string, string>;
    imageUrl?: string;
  },
) {
  await createClientNotification({
    clientId,
    title: message.title,
    body: message.body,
    type: message.type,
    data: message.data,
  }).catch(() => undefined);

  const fcm = getFcm();
  if (!fcm) return; // push not configured — inbox still updated above
  const tokens = await getClientDeviceTokens(clientId);
  if (!tokens.length) return;

  const imageUrl = message.imageUrl?.trim();
  const response = await fcm.sendEachForMulticast({
    tokens,
    notification: {
      title: message.title,
      body: message.body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    data: {
      ...message.data,
      ...(imageUrl ? { imageUrl } : {}),
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "sarjan_default",
        ...(imageUrl ? { imageUrl } : {}),
      },
    },
    apns: {
      payload: {
        aps: { sound: "default", mutableContent: imageUrl ? true : undefined },
      },
      ...(imageUrl ? { fcmOptions: { imageUrl } } : {}),
    },
  });

  // Prune tokens FCM says are no longer valid (app uninstalled, etc.).
  const stale: string[] = [];
  response.responses.forEach((res, index) => {
    if (res.success) return;
    const code = res.error?.code;
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token" ||
      code === "messaging/invalid-argument"
    ) {
      stale.push(tokens[index]);
    }
  });
  if (stale.length) await removeDeviceTokens(stale);
}

export async function sendOrderPlacedPush(order: LocalOrder) {
  await pushToClient(order.clientId, {
    title: "Order placed 🎉",
    body: `Order ${order.id} placed for ${formatInr(order.subtotal)}. We'll review it shortly.`,
    type: "order",
    data: {
      type: "order",
      id: order.id,
      orderId: order.id,
      screen: "OrderDetail",
    },
  });
}

export async function sendOrderStatusPush(order: LocalOrder) {
  const copy = statusCopy[order.status];
  if (!copy) return;
  const pushType = order.status === "Dispatched" ? "dispatch" : "order";
  await pushToClient(order.clientId, {
    title: copy.title,
    body: copy.body(order),
    type: pushType,
    data: {
      type: pushType,
      id: order.id,
      orderId: order.id,
      screen: "OrderDetail",
    },
  });
}

export async function sendReviewReminderPush(
  order: LocalOrder,
  product: { slug: string; name: string; image?: string },
) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarjantextiles.com";
  const url = `${base}/products/${encodeURIComponent(product.slug)}?review=1&orderId=${encodeURIComponent(order.id)}`;
  await pushToClient(order.clientId, {
    title: "How was your order?",
    body: `Share your experience with ${product.name}.`,
    type: "general",
    data: {
      type: "general",
      url,
      screen: "WriteReview",
      orderId: order.id,
      productSlug: product.slug,
      productId: product.slug,
      productName: product.name,
    },
  });
}

async function multicastPush(
  tokens: string[],
  message: {
    title: string;
    body: string;
    data: Record<string, string>;
  },
) {
  const fcm = getFcm();
  if (!fcm || !tokens.length) return { sent: 0 };

  const chunkSize = 500;
  let sent = 0;
  const stale: string[] = [];

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const response = await fcm.sendEachForMulticast({
      tokens: chunk,
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "sarjan_default",
        },
      },
      apns: { payload: { aps: { sound: "default" } } },
    });
    sent += response.successCount;
    response.responses.forEach((res, index) => {
      if (res.success) return;
      const code = res.error?.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token" ||
        code === "messaging/invalid-argument"
      ) {
        stale.push(chunk[index]);
      }
    });
  }

  if (stale.length) await removeDeviceTokens(stale);
  return { sent };
}

/** Marketing / offers / new posts — guests + all registered devices. */
export async function sendBroadcastPush(input: {
  title: string;
  body: string;
  type: "collection" | "arrival" | "offer" | "general";
  image?: string;
  data?: Record<string, string>;
}) {
  const data = {
    type: input.type,
    scope: "broadcast",
    ...(input.data ?? {}),
  };

  await createBroadcastNotification({
    title: input.title,
    body: input.body,
    type: input.type,
    image: input.image,
    data,
  });

  const tokens = await getAllPushDeviceTokens();
  const result = await multicastPush(tokens, {
    title: input.title,
    body: input.body,
    data,
  });
  return { tokens: tokens.length, sent: result.sent };
}

/** Admin: notify one approved client (order-style or promo). */
export async function sendAdminClientPush(input: {
  clientId: string;
  title: string;
  body: string;
  type: ClientNotificationRecord["type"];
  data?: Record<string, string>;
}) {
  await pushToClient(input.clientId, {
    title: input.title,
    body: input.body,
    type: input.type,
    data: input.data ?? { type: input.type, scope: "admin" },
  });
}

/** Remind approved clients to finish checkout (app push + inbox). */
export async function sendAbandonedCartPush(input: {
  clientId: string;
  title: string;
  body: string;
  stage: 1 | 2 | "daily";
  checkoutUrl: string;
  itemCount: string;
  imageUrl?: string;
}) {
  await pushToClient(input.clientId, {
    title: input.title,
    body: input.body,
    type: "cart",
    imageUrl: input.imageUrl,
    data: {
      type: "cart",
      scope: "abandoned_cart",
      stage: String(input.stage),
      screen: "Cart",
      url: input.checkoutUrl,
      itemCount: input.itemCount,
    },
  });
}
