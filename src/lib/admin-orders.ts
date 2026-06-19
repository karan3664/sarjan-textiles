import { clients as demoClients, orders as demoOrders } from "@/data/mock";
import { includeAdminDemoData } from "@/lib/admin-demo-data";
import { readLocalDb, type LocalOrder } from "@/lib/local-db";
import { orderStatuses, type OrderStatus } from "@/lib/order-statuses";

export { orderStatuses, type OrderStatus };

function demoOrderStatus(status: string): LocalOrder["status"] {
  if (orderStatuses.includes(status as OrderStatus))
    return status as LocalOrder["status"];
  return "Pending approval";
}

function creditDueDate(createdAt: string, days = 30) {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function getAdminOrders() {
  const db = await readLocalDb();
  const localOrders = db.orders.map((order) => {
    const client = db.clients.find((item) => item.id === order.clientId);
    return {
      ...order,
      source: "local" as const,
      clientName: client?.companyName ?? order.clientEmail,
      clientStatus: client?.status ?? "pending",
      outstandingAmount: Math.max(0, order.subtotal - (order.paidAmount ?? 0)),
      creditDueOn: creditDueDate(order.createdAt, order.creditDays),
    };
  });

  if (!includeAdminDemoData()) {
    return localOrders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const demo = demoOrders.map((order) => {
    const client = demoClients.find((item) => item.name === order.client);
    return {
      id: order.id,
      clientId: client?.id ?? "demo",
      clientEmail: `${client?.id.toLowerCase() ?? "demo"}@sarjan-demo.local`,
      clientName: order.client,
      clientStatus: client?.status === "Approved" ? "approved" : "pending",
      status: demoOrderStatus(order.status),
      approvalRemark: "",
      paymentMode: "cheque" as const,
      paymentStatus: "Pending" as const,
      creditDays: 30,
      paidAmount: 0,
      chequeNumber: "",
      chequeDate: "",
      bankDetails: "",
      depositStatus: "Not deposited" as const,
      paymentReceivedAt: "",
      subtotal: order.total,
      outstandingAmount: order.total,
      creditDueOn: order.creditDueOn,
      items: [],
      dispatchAddress: client?.city ?? "",
      dispatchDate: "",
      transportDetails: "",
      lrNumber: "",
      courierDetails: "",
      vehicleDetails: "",
      trackingNotes: "",
      dispatchHistory: [
        {
          status: order.status,
          note: "Demo order.",
          createdAt: `${order.placedOn}T00:00:00.000Z`,
        },
      ],
      note: "",
      placedVia: "storefront" as const,
      createdAt: `${order.placedOn}T00:00:00.000Z`,
      source: "demo" as const,
    };
  });

  return [...localOrders, ...demo].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export type AdminOrder = Awaited<ReturnType<typeof getAdminOrders>>[number];
