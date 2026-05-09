import { clients as demoClients, orders as demoOrders } from "@/data/mock";
import { orderStatuses } from "@/lib/admin-orders";
import { getClients, readLocalDb, type LocalOrder } from "@/lib/local-db";

function demoOrderStatus(status: string): LocalOrder["status"] {
  if (orderStatuses.includes(status as LocalOrder["status"])) return status as LocalOrder["status"];
  return "Pending approval";
}

export async function getAdminCustomers() {
  const db = await readLocalDb();
  const localClients = await getClients();
  const localCustomers = localClients.map((client) => ({
    source: "local" as const,
    id: client.id,
    email: client.email,
    companyName: client.companyName,
    gst: client.gst ?? "",
    city: client.city ?? client.address?.city ?? "",
    phone: client.phone ?? client.address?.phone ?? "",
    status: client.status,
    outstanding: db.orders.filter((order) => order.clientId === client.id && order.status !== "Delivered").reduce((sum, order) => sum + order.subtotal, 0),
    createdAt: client.createdAt,
    orders: db.orders.filter((order) => order.clientId === client.id),
  }));

  const demoCustomers = demoClients.map((client) => ({
    source: "demo" as const,
    id: client.id,
    email: `${client.id.toLowerCase()}@sarjan-demo.local`,
    companyName: client.name,
    gst: "Demo GST",
    city: client.city,
    phone: "",
    status: client.status === "Approved" ? "approved" : "pending",
    outstanding: client.outstanding,
    createdAt: "2026-05-01T00:00:00.000Z",
    orders: demoOrders
      .filter((order) => order.client === client.name)
      .map((order) => ({
        id: order.id,
        clientId: client.id,
        clientEmail: `${client.id.toLowerCase()}@sarjan-demo.local`,
        status: demoOrderStatus(order.status),
        paymentMode: "cheque" as const,
        creditDays: 90,
        subtotal: order.total,
        items: [],
        dispatchAddress: client.city,
        note: "",
        createdAt: `${order.placedOn}T00:00:00.000Z`,
      })),
  }));

  return [...localCustomers, ...demoCustomers];
}

export type AdminCustomer = Awaited<ReturnType<typeof getAdminCustomers>>[number];
