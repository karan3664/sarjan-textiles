import { getClientDeviceTokens, removeDeviceTokens } from "@/lib/device-tokens";
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
  Approved: {
    title: "Order approved ✅",
    body: (o) => `Great news! Order ${o.id} has been approved.`,
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
    body: (o) => `Order ${o.id} has been delivered. Thank you!`,
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
    data: Record<string, string>;
  },
) {
  const fcm = getFcm();
  if (!fcm) return; // push not configured — silently skip
  const tokens = await getClientDeviceTokens(clientId);
  if (!tokens.length) return;

  const response = await fcm.sendEachForMulticast({
    tokens,
    notification: { title: message.title, body: message.body },
    data: message.data,
    android: {
      priority: "high",
      notification: { sound: "default" },
    },
    apns: { payload: { aps: { sound: "default" } } },
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
    data: { type: "order", id: order.id, screen: "OrderDetail" },
  });
}

export async function sendOrderStatusPush(order: LocalOrder) {
  const copy = statusCopy[order.status];
  if (!copy) return;
  await pushToClient(order.clientId, {
    title: copy.title,
    body: copy.body(order),
    data: { type: "order", id: order.id, screen: "OrderDetail" },
  });
}
