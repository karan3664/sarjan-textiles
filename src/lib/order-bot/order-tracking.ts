import { readLocalDb, type LocalOrder } from "@/lib/local-db";

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function getClientOrders(clientId: string, limit = 8) {
  const db = await readLocalDb();
  return db.orders
    .filter((order) => order.clientId === clientId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

export async function findClientOrder(clientId: string, orderId: string) {
  const needle = orderId.trim().toUpperCase();
  const db = await readLocalDb();
  return (
    db.orders.find(
      (order) =>
        order.clientId === clientId && order.id.toUpperCase() === needle,
    ) ?? null
  );
}

export function formatOrderTrackingSummary(order: LocalOrder) {
  const lines: string[] = [
    `**${order.id}**`,
    `Status: **${order.status}**`,
    `Placed: ${formatDate(order.createdAt) ?? order.createdAt}`,
    `Total: **${money(order.subtotal)}**`,
    `Items: ${order.items.length} line(s)`,
  ];

  if (order.placedVia === "ai_bot") {
    lines.push("Placed via: AI order assistant");
  }
  if (order.paymentStatus) {
    lines.push(`Payment: ${order.paymentStatus}`);
  }
  if (order.depositStatus) {
    lines.push(`Cheque deposit: ${order.depositStatus}`);
  }
  if (order.dispatchDate) {
    lines.push(`Dispatch date: ${formatDate(order.dispatchDate)}`);
  }
  if (order.lrNumber) lines.push(`LR number: ${order.lrNumber}`);
  if (order.transportDetails)
    lines.push(`Transport: ${order.transportDetails}`);
  if (order.courierDetails) lines.push(`Courier: ${order.courierDetails}`);
  if (order.vehicleDetails) lines.push(`Vehicle: ${order.vehicleDetails}`);
  if (order.trackingNotes) lines.push(`Notes: ${order.trackingNotes}`);

  const history = (order.dispatchHistory ?? []).slice().reverse();
  if (history.length) {
    lines.push("", "Dispatch updates:");
    for (const entry of history.slice(0, 6)) {
      const when = formatDate(entry.createdAt);
      lines.push(
        `• ${entry.status}${entry.note ? ` — ${entry.note}` : ""}${when ? ` (${when})` : ""}`,
      );
    }
  }

  lines.push(
    "",
    `Full timeline: **/account** (Your Orders) or **/order-tracking**`,
  );
  return lines.join("\n");
}

export function formatOrdersList(orders: LocalOrder[]) {
  if (!orders.length) {
    return "You have no orders yet. Browse products in chat or on **/products**, add sets to cart, then place an order.";
  }
  return orders
    .map((order) => {
      const via = order.placedVia === "ai_bot" ? " · AI assistant" : "";
      return `• **${order.id}** — ${order.status}, ${money(order.subtotal)}${via}`;
    })
    .join("\n");
}
