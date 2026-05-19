import { getCmsSnapshot } from "@/lib/cms-store";
import { readLocalDb } from "@/lib/local-db";
import { getWebsiteAnalytics } from "@/lib/analytics-store";

function money(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function monthKey(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", { month: "short" });
}

function lastSixMonthLabels() {
  const labels: string[] = [];
  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    labels.push(date.toLocaleString("en-US", { month: "short" }));
  }
  return labels;
}

function statusCount<T extends { status?: string }>(
  items: T[],
  status: string,
) {
  return items.filter((item) => item.status === status).length;
}

function isDispatchPending(status: string) {
  return ["Approved", "In Production", "Packed", "Ready for Dispatch"].includes(
    status,
  );
}

export async function getAdminDashboardData() {
  const [cms, db, analytics] = await Promise.all([
    getCmsSnapshot(),
    readLocalDb(),
    getWebsiteAnalytics(),
  ]);
  const products = cms.products;
  const orders = db.orders;
  const clients = db.clients;
  const feedbacks = db.feedbacks ?? [];
  const monthLabels = lastSixMonthLabels();

  const pendingOrders = statusCount(orders, "Pending approval");
  const approvedOrders = orders.filter((order) =>
    ["Approved", "In Production", "Packed", "Ready for Dispatch"].includes(
      order.status,
    ),
  ).length;
  const completedOrders = statusCount(orders, "Delivered");
  const dispatchPending = orders.filter((order) =>
    isDispatchPending(order.status),
  ).length;
  const outstanding = orders.reduce(
    (sum, order) => sum + Math.max(0, order.subtotal - (order.paidAmount ?? 0)),
    0,
  );
  const overdue = orders.reduce((sum, order) => {
    const due = new Date(order.createdAt);
    due.setDate(due.getDate() + order.creditDays);
    return due.getTime() < Date.now() && order.paymentStatus !== "Paid"
      ? sum + Math.max(0, order.subtotal - (order.paidAmount ?? 0))
      : sum;
  }, 0);
  const monthlyRevenue = orders
    .filter(
      (order) =>
        monthKey(order.createdAt) === monthKey(new Date().toISOString()) &&
        order.paymentStatus === "Paid",
    )
    .reduce((sum, order) => sum + order.subtotal, 0);
  const reservedStock = products.reduce(
    (sum, product) => sum + (product.reserved ?? 0),
    0,
  );
  const lowStock = products.filter(
    (product) =>
      product.stock > 0 && product.stock <= Math.max(product.moq, 50),
  ).length;
  const outOfStock = products.filter((product) => product.stock <= 0).length;

  const monthlyOrders = monthLabels.map((label) => ({
    label,
    value: orders.filter((order) => monthKey(order.createdAt) === label).length,
  }));

  const productDemandMap = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      productDemandMap.set(
        item.name,
        (productDemandMap.get(item.name) ?? 0) + item.setQuantity,
      );
    }
  }
  const productDemand = Array.from(productDemandMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({
      label: label.length > 18 ? `${label.slice(0, 18)}...` : label,
      value,
    }));

  const clientActivity = clients.slice(0, 6).map((client) => ({
    label:
      client.companyName.length > 18
        ? `${client.companyName.slice(0, 18)}...`
        : client.companyName,
    value: orders.filter((order) => order.clientId === client.id).length,
  }));

  const dispatchTrend = monthLabels.map((label) => ({
    label,
    value: orders.filter(
      (order) =>
        monthKey(order.createdAt) === label &&
        ["Dispatched", "Delivered"].includes(order.status),
    ).length,
  }));

  return {
    summary: [
      {
        label: "Total Orders",
        value: orders.length,
        icon: "icon-dollar",
        note: `${pendingOrders} pending`,
      },
      {
        label: "Total Clients",
        value: clients.length,
        icon: "icon-users",
        note: `${statusCount(clients, "pending")} pending approval`,
      },
      {
        label: "Low Stock",
        value: lowStock,
        icon: "icon-basket",
        note: `${outOfStock} out of stock`,
      },
      {
        label: "Outstanding",
        value: money(outstanding),
        icon: "icon-hand-coins",
        note: `${money(overdue)} overdue`,
      },
    ],
    groups: [
      {
        title: "Orders",
        icon: "icon-dollar",
        items: [
          { label: "Total Orders", value: orders.length },
          { label: "Pending Orders", value: pendingOrders },
          { label: "Approved Orders", value: approvedOrders },
          { label: "Dispatch Pending", value: dispatchPending },
          { label: "Completed Orders", value: completedOrders },
        ],
      },
      {
        title: "Clients",
        icon: "icon-users",
        items: [
          { label: "Total Clients", value: clients.length },
          { label: "Active Clients", value: statusCount(clients, "approved") },
          {
            label: "Pending Approval Clients",
            value: statusCount(clients, "pending"),
          },
        ],
      },
      {
        title: "Inventory",
        icon: "icon-basket",
        items: [
          { label: "Low Stock", value: lowStock },
          { label: "Out Of Stock", value: outOfStock },
          { label: "Reserved Stock", value: reservedStock },
        ],
      },
      {
        title: "Finance",
        icon: "icon-hand-coins",
        items: [
          { label: "Outstanding Payments", value: money(outstanding) },
          { label: "Overdue Payments", value: money(overdue) },
          { label: "Monthly Revenue", value: money(monthlyRevenue) },
        ],
      },
      {
        title: "Website",
        icon: "icon-chart-bar",
        items: [
          {
            label: "Total Visitors",
            value: analytics.totalVisitors.toLocaleString("en-IN"),
          },
          {
            label: "Page Views",
            value: analytics.pageViews.toLocaleString("en-IN"),
          },
          { label: "Inquiry Count", value: feedbacks.length },
          {
            label: "Contact Requests",
            value: feedbacks.filter((item) => item.status !== "replied").length,
          },
        ],
      },
    ],
    charts: {
      monthlyOrders,
      productDemand: productDemand.length
        ? productDemand
        : products.slice(0, 6).map((product) => ({
            label:
              product.name.length > 18
                ? `${product.name.slice(0, 18)}...`
                : product.name,
            value: product.sold ?? 0,
          })),
      clientActivity,
      dispatchTrend,
    },
    recentOrders: orders.slice(0, 8).map((order) => ({
      id: order.id,
      client:
        clients.find((client) => client.id === order.clientId)?.companyName ??
        order.clientEmail,
      date: new Date(order.createdAt).toLocaleDateString("en-IN"),
      total: money(order.subtotal),
      paymentStatus: order.paymentStatus ?? "Pending",
      dispatchStatus: order.status,
      approvalStatus: order.status,
    })),
    alerts: [
      {
        label: "Pending Client Approvals",
        detail: `${statusCount(clients, "pending")} client registration requests need review.`,
      },
      {
        label: "Pending Orders",
        detail: `${pendingOrders} orders waiting for admin approval.`,
      },
      {
        label: "Inventory Alerts",
        detail: `${lowStock} products low stock and ${outOfStock} out of stock.`,
      },
      {
        label: "Contact Requests",
        detail: `${feedbacks.filter((item) => item.status !== "replied").length} inquiries waiting for reply.`,
      },
    ],
  };
}
