import type { LocalClient, LocalOrder } from "@/lib/local-db";

export type CommerceHubSnapshot = {
  duplicateOrderSignals: Array<{
    orderA: string;
    orderB: string;
    reason: string;
  }>;
  rapidOrderClients: Array<{
    clientId: string;
    email?: string;
    companyName?: string;
    orders24h: number;
  }>;
  creditAlerts: Array<{
    clientId: string;
    companyName?: string;
    outstandingInr: number;
  }>;
  segmentSummary: Record<string, number>;
  orderCount: number;
  clientCount: number;
};

function itemFingerprint(items: LocalOrder["items"]) {
  return [...items]
    .map((item) => `${item.slug}:${item.setQuantity}:${item.color}`)
    .sort()
    .join("|");
}

function parseTs(iso: string) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export function buildCommerceHubSnapshot(
  db: { orders: LocalOrder[]; clients: LocalClient[] },
  creditAlertThreshold: number,
): CommerceHubSnapshot {
  const { orders, clients } = db;
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const now = Date.now();

  const duplicateOrderSignals: CommerceHubSnapshot["duplicateOrderSignals"] =
    [];
  for (let i = 0; i < orders.length; i += 1) {
    for (let j = i + 1; j < orders.length; j += 1) {
      const a = orders[i];
      const b = orders[j];
      if (a.clientId !== b.clientId) continue;
      if (Math.abs(parseTs(a.createdAt) - parseTs(b.createdAt)) > hour)
        continue;
      if (Math.abs(a.subtotal - b.subtotal) > 1) continue;
      if (itemFingerprint(a.items) !== itemFingerprint(b.items)) continue;
      duplicateOrderSignals.push({
        orderA: a.id,
        orderB: b.id,
        reason:
          "Same client, matching lines and value within 60 minutes (possible duplicate submit).",
      });
    }
  }

  const orders24hByClient = new Map<string, number>();
  for (const order of orders) {
    if (now - parseTs(order.createdAt) > day) continue;
    orders24hByClient.set(
      order.clientId,
      (orders24hByClient.get(order.clientId) ?? 0) + 1,
    );
  }
  const rapidOrderClients = [...orders24hByClient.entries()]
    .filter(([, count]) => count >= 4)
    .map(([clientId, orders24h]) => {
      const client = clientById.get(clientId);
      return {
        clientId,
        email: client?.email,
        companyName: client?.companyName,
        orders24h,
      };
    });

  const outstandingByClient = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "Delivered" || order.status === "Rejected") continue;
    const paid = order.paidAmount ?? 0;
    const due = Math.max(0, order.subtotal - paid);
    outstandingByClient.set(
      order.clientId,
      (outstandingByClient.get(order.clientId) ?? 0) + due,
    );
  }
  const creditAlerts = [...outstandingByClient.entries()]
    .filter(([, amount]) => amount >= creditAlertThreshold)
    .map(([clientId, outstandingInr]) => ({
      clientId,
      companyName: clientById.get(clientId)?.companyName,
      outstandingInr: Math.round(outstandingInr),
    }));

  const segmentSummary: Record<string, number> = {};
  for (const client of clients) {
    if (client.status !== "approved") continue;
    const city = client.city?.trim() || "Unknown city";
    segmentSummary[city] = (segmentSummary[city] ?? 0) + 1;
  }

  return {
    duplicateOrderSignals: duplicateOrderSignals.slice(0, 50),
    rapidOrderClients,
    creditAlerts,
    segmentSummary,
    orderCount: orders.length,
    clientCount: clients.length,
  };
}
