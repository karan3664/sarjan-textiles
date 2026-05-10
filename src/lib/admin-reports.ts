import { getAdminCustomers } from "@/lib/admin-customers";
import { getAdminOrders } from "@/lib/admin-orders";
import { getCmsSnapshot } from "@/lib/cms-store";

function inr(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export async function getAdminReportsData() {
  const [orders, customers, cms] = await Promise.all([getAdminOrders(), getAdminCustomers(), getCmsSnapshot()]);
  const products = cms.products;
  const inventoryLogs = cms.inventoryLogs ?? [];
  const outstanding = orders.reduce((sum, order) => sum + (order.outstandingAmount ?? 0), 0);
  const lowStock = products.filter((product) => product.stock > 0 && product.stock - product.reserved <= product.moq);

  return {
    summary: [
      { label: "Orders", value: orders.length },
      { label: "Clients", value: customers.length },
      { label: "Outstanding", value: inr(outstanding) },
      { label: "Low Stock", value: lowStock.length },
    ],
    orders: orders.map((order) => ({
      id: order.id,
      client: order.clientName,
      status: order.status,
      paymentStatus: order.paymentStatus ?? "Pending",
      dispatchStatus: order.status,
      total: order.subtotal,
      outstanding: order.outstandingAmount ?? 0,
      createdAt: order.createdAt,
    })),
    clients: customers.map((client) => ({
      id: client.id,
      company: client.companyName,
      email: client.email,
      city: client.city,
      status: client.status,
      orders: client.orders.length,
      outstanding: client.outstanding,
      createdAt: client.createdAt,
    })),
    inventory: products.map((product) => ({
      sku: product.sku,
      product: product.name,
      category: product.category,
      available: Math.max(0, product.stock - product.reserved),
      reserved: product.reserved,
      sold: product.sold,
      returned: product.returned ?? 0,
      damaged: product.damaged ?? 0,
      status: product.stock <= 0 ? "Out of Stock" : product.stock - product.reserved <= product.moq ? "Low Stock" : "Healthy",
    })),
    finance: orders.filter((order) => order.status !== "Rejected").map((order) => ({
      order: order.id,
      client: order.clientName,
      invoice: order.subtotal,
      paid: order.paidAmount ?? 0,
      outstanding: order.outstandingAmount ?? 0,
      paymentStatus: order.paymentStatus ?? "Pending",
      chequeNumber: order.chequeNumber ?? "",
      depositStatus: order.depositStatus ?? "Not deposited",
      creditDueOn: order.creditDueOn,
    })),
    dispatch: orders.flatMap((order) => (order.dispatchHistory ?? []).map((log) => ({
      order: order.id,
      client: order.clientName,
      status: log.status,
      note: log.note ?? "",
      lrNumber: order.lrNumber ?? "",
      vehicleDetails: order.vehicleDetails ?? "",
      createdAt: log.createdAt,
    }))),
    productMovement: inventoryLogs.map((log) => ({
      date: log.createdAt,
      product: log.productName,
      sku: log.sku,
      operation: log.operation,
      quantity: log.quantity,
      before: log.beforeStock,
      after: log.afterStock,
      reference: log.reference ?? "",
      note: log.note ?? "",
    })),
  };
}

export type AdminReportsData = Awaited<ReturnType<typeof getAdminReportsData>>;
