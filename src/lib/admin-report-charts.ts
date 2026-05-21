import type { AdminReportsData } from "@/lib/admin-reports";

export type ReportKey =
  | "orders"
  | "clients"
  | "inventory"
  | "finance"
  | "dispatch"
  | "productMovement";

export type ReportChartKind = "bar" | "line" | "pie" | "area";

export type ReportChartDefinition = {
  id: string;
  label: string;
  kind: ReportChartKind;
  description: string;
  data: Array<{ name: string; value: number; value2?: number }>;
  /** Second series label for dual bar/line charts */
  value2Label?: string;
};

const CHART_COLORS = [
  "#8b1e2d",
  "#b38b45",
  "#2fb86c",
  "#4a7fc1",
  "#9b6bb8",
  "#e07b54",
  "#5c6bc0",
  "#26a69a",
];

export function reportChartColors() {
  return CHART_COLORS;
}

/** Hide pie labels on 0% / tiny slices so Recharts does not stack them on one point. */
export function pieSliceLabel(props: {
  name?: string;
  percent?: number;
  value?: number;
}): string | null {
  const percent = props.percent ?? 0;
  const value = Number(props.value ?? 0);
  if (value <= 0 || percent < 0.04) return null;
  return `${props.name ?? ""} (${(percent * 100).toFixed(0)}%)`;
}

export const CHART_TICK_FILL = "#3d3d3d";

export function reportChartTickProps(fontSize = 12) {
  return { fontSize, fill: CHART_TICK_FILL };
}

/**
 * Chart margins — keep left small: Recharts already reserves YAxis `width` in layout.
 * Large margin.left + YAxis width was double-counting and hid axes/grid on narrow canvases.
 */
export function reportChartMargins(pointCount: number) {
  const crowded = pointCount > 5;
  return {
    top: 16,
    right: 20,
    left: 4,
    bottom: crowded ? 56 : 40,
  } as const;
}

export function reportChartXAxisProps(pointCount: number) {
  const crowded = pointCount > 5;
  return {
    dataKey: "name" as const,
    tick: reportChartTickProps(crowded ? 11 : 12),
    interval: 0 as const,
    angle: crowded ? -28 : 0,
    textAnchor: crowded ? ("end" as const) : ("middle" as const),
    height: crowded ? 72 : 44,
    dy: crowded ? 6 : 10,
    axisLine: { stroke: "rgba(24, 24, 24, 0.22)" },
    tickLine: { stroke: "rgba(24, 24, 24, 0.22)" },
  };
}

export function reportChartYAxisProps(width = 72) {
  return {
    tick: reportChartTickProps(11),
    width,
    tickMargin: 6,
    axisLine: { stroke: "rgba(24, 24, 24, 0.22)" },
    tickLine: { stroke: "rgba(24, 24, 24, 0.22)" },
  };
}

function countBy(
  rows: Array<Record<string, unknown>>,
  field: string,
): Array<{ name: string; value: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[field] ?? "Unknown").trim() || "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function sumByField(
  rows: Array<Record<string, unknown>>,
  groupField: string,
  valueField: string,
  limit = 10,
): Array<{ name: string; value: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[groupField] ?? "Unknown").trim() || "Unknown";
    const num = Number(row[valueField] ?? 0);
    map.set(key, (map.get(key) ?? 0) + (Number.isFinite(num) ? num : 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function sumByMonth(
  rows: Array<{ createdAt: string; total: number }>,
  months = 8,
): Array<{ name: string; value: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(row.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + row.total);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months)
    .map(([key, value]) => {
      const [year, month] = key.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleString(
        "en-IN",
        { month: "short", year: "2-digit" },
      );
      return { name: label, value: Math.round(value) };
    });
}

export function getReportCharts(
  report: ReportKey,
  data: AdminReportsData,
): ReportChartDefinition[] {
  switch (report) {
    case "orders": {
      const orders = data.orders;
      return [
        {
          id: "orders-by-status",
          label: "Orders by status",
          kind: "pie",
          description: "Count of orders in each workflow status.",
          data: countBy(orders, "status"),
        },
        {
          id: "orders-by-payment",
          label: "Orders by payment status",
          kind: "pie",
          description: "Payment collection status across orders.",
          data: countBy(orders, "paymentStatus"),
        },
        {
          id: "orders-revenue-month",
          label: "Order value by month",
          kind: "bar",
          description: "Total order value placed per month.",
          data: sumByMonth(
            orders.map((o) => ({
              createdAt: String(o.createdAt),
              total: Number(o.total) || 0,
            })),
          ),
        },
        {
          id: "orders-by-client",
          label: "Top clients by order value",
          kind: "bar",
          description: "Highest order value by client.",
          data: sumByField(orders, "client", "total", 8),
        },
        {
          id: "orders-outstanding-client",
          label: "Outstanding by client",
          kind: "bar",
          description: "Open balance by client (top 8).",
          data: sumByField(orders, "client", "outstanding", 8),
        },
        {
          id: "orders-trend",
          label: "Orders trend (monthly)",
          kind: "line",
          description: "Number of orders created per month.",
          data: sumByMonth(
            orders.map((o) => ({
              createdAt: String(o.createdAt),
              total: 1,
            })),
          ),
        },
      ];
    }
    case "clients": {
      const clients = data.clients;
      return [
        {
          id: "clients-by-status",
          label: "Clients by approval status",
          kind: "pie",
          description: "Pending, approved, rejected, and inactive clients.",
          data: countBy(clients, "status"),
        },
        {
          id: "clients-by-city",
          label: "Clients by city",
          kind: "bar",
          description: "Client count per city (top 10).",
          data: countBy(clients, "city").slice(0, 10),
        },
        {
          id: "clients-outstanding",
          label: "Outstanding by client",
          kind: "bar",
          description: "Credit outstanding per company.",
          data: sumByField(clients, "company", "outstanding", 10),
        },
        {
          id: "clients-orders-count",
          label: "Orders per client",
          kind: "bar",
          description: "Total orders linked to each client.",
          data: sumByField(clients, "company", "orders", 10),
        },
      ];
    }
    case "inventory": {
      const inventory = data.inventory;
      return [
        {
          id: "inventory-by-status",
          label: "Stock health",
          kind: "pie",
          description: "Healthy, low stock, and out of stock SKUs.",
          data: countBy(inventory, "status"),
        },
        {
          id: "inventory-by-category",
          label: "Available stock by category",
          kind: "bar",
          description: "Sum of available units per category.",
          data: sumByField(inventory, "category", "available", 12),
        },
        {
          id: "inventory-top-available",
          label: "Top products by available qty",
          kind: "bar",
          description: "Products with highest available inventory.",
          data: sumByField(inventory, "product", "available", 10),
        },
        {
          id: "inventory-reserved",
          label: "Reserved vs available",
          kind: "bar",
          description: "Top SKUs: available (value) and reserved (value2).",
          data: inventory
            .slice()
            .sort(
              (a, b) =>
                Number(b.reserved) +
                Number(b.available) -
                (Number(a.reserved) + Number(a.available)),
            )
            .slice(0, 8)
            .map((row) => ({
              name: String(row.product).slice(0, 28),
              value: Number(row.available) || 0,
              value2: Number(row.reserved) || 0,
            })),
          value2Label: "Reserved",
        },
      ];
    }
    case "finance": {
      const finance = data.finance;
      return [
        {
          id: "finance-payment-status",
          label: "Payment status",
          kind: "pie",
          description: "Pending, partial, paid, and overdue invoices.",
          data: countBy(finance, "paymentStatus"),
        },
        {
          id: "finance-deposit-status",
          label: "Cheque deposit status",
          kind: "pie",
          description: "Deposit workflow for cheque payments.",
          data: countBy(finance, "depositStatus"),
        },
        {
          id: "finance-outstanding-client",
          label: "Outstanding by client",
          kind: "bar",
          description: "Open invoice balance by client.",
          data: sumByField(finance, "client", "outstanding", 10),
        },
        {
          id: "finance-paid-vs-outstanding",
          label: "Paid vs outstanding (top clients)",
          kind: "bar",
          description:
            "Paid amount (value) and outstanding (value2) per client.",
          data: finance
            .slice()
            .sort(
              (a, b) =>
                Number(b.outstanding) +
                Number(b.paid) -
                (Number(a.outstanding) + Number(a.paid)),
            )
            .slice(0, 8)
            .map((row) => ({
              name: String(row.client).slice(0, 24),
              value: Number(row.paid) || 0,
              value2: Number(row.outstanding) || 0,
            })),
          value2Label: "Outstanding",
        },
        {
          id: "finance-invoice-total",
          label: "Invoice value by client",
          kind: "bar",
          description: "Total invoice amount per client.",
          data: sumByField(finance, "client", "invoice", 8),
        },
      ];
    }
    case "dispatch": {
      const dispatch = data.dispatch;
      return [
        {
          id: "dispatch-by-status",
          label: "Dispatch events by status",
          kind: "bar",
          description: "Count of dispatch log entries per status.",
          data: countBy(dispatch, "status"),
        },
        {
          id: "dispatch-by-client",
          label: "Dispatch activity by client",
          kind: "bar",
          description: "Dispatch log count per client.",
          data: countBy(dispatch, "client").slice(0, 10),
        },
        {
          id: "dispatch-timeline",
          label: "Dispatch timeline (monthly)",
          kind: "line",
          description: "Dispatch log entries per month.",
          data: sumByMonth(
            dispatch.map((row) => ({
              createdAt: String(row.createdAt),
              total: 1,
            })),
          ),
        },
      ];
    }
    case "productMovement": {
      const movement = data.productMovement;
      return [
        {
          id: "movement-by-operation",
          label: "Movements by operation",
          kind: "pie",
          description: "Stock in, out, adjust, and related operations.",
          data: countBy(movement, "operation"),
        },
        {
          id: "movement-qty-operation",
          label: "Quantity by operation",
          kind: "bar",
          description: "Total quantity moved per operation type.",
          data: sumByField(
            movement.map((row) => ({
              ...row,
              quantity: Math.abs(Number(row.quantity) || 0),
            })),
            "operation",
            "quantity",
            12,
          ),
        },
        {
          id: "movement-top-products",
          label: "Top products by movement qty",
          kind: "bar",
          description: "Products with highest movement volume.",
          data: sumByField(
            movement.map((row) => ({
              ...row,
              quantity: Math.abs(Number(row.quantity) || 0),
            })),
            "product",
            "quantity",
            10,
          ),
        },
        {
          id: "movement-timeline",
          label: "Movement activity (monthly)",
          kind: "area",
          description: "Inventory log entries per month.",
          data: sumByMonth(
            movement.map((row) => ({
              createdAt: String(row.date),
              total: 1,
            })),
          ),
        },
      ];
    }
    default:
      return [];
  }
}

export function formatChartValue(value: number, report: ReportKey) {
  const isCurrency =
    report === "orders" || report === "finance" || report === "clients";
  if (isCurrency && value >= 100) {
    return `₹${Math.round(value).toLocaleString("en-IN")}`;
  }
  return Math.round(value).toLocaleString("en-IN");
}
