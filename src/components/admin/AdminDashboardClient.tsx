"use client";

import { useEffect, useState } from "react";
import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";

type DashboardItem = {
  label: string;
  value: string | number;
};

type DashboardSummary = DashboardItem & {
  icon: string;
  note: string;
};

type DashboardGroup = {
  title: string;
  icon: string;
  items: DashboardItem[];
};

type ChartPoint = {
  label: string;
  value: number;
};

type RecentOrder = {
  id: string;
  client: string;
  date: string;
  total: string;
  paymentStatus: string;
  dispatchStatus: string;
  approvalStatus: string;
};

type DashboardData = {
  summary: DashboardSummary[];
  groups: DashboardGroup[];
  charts: {
    monthlyOrders: ChartPoint[];
    monthlySales: ChartPoint[];
    clientSignups: ChartPoint[];
    productDemand: ChartPoint[];
    clientActivity: ChartPoint[];
    dispatchTrend: ChartPoint[];
    monthlyUnitsSold: ChartPoint[];
    stockSnapshot: ChartPoint[];
  };
  recentOrders: RecentOrder[];
  alerts: Array<{ label: string; detail: string }>;
};

type StatusCol = "payment" | "dispatch" | "approval";

function statusClass(status: string, col: StatusCol) {
  const n = status.toLowerCase().trim();
  if (col === "approval") {
    if (n.includes("pending approval")) return "type-pending";
    if (n.includes("rejected")) return "type-pending";
    if (n === "approved") return "type-completed";
    return "type-pending";
  }
  if (col === "payment") {
    if (n === "paid") return "type-completed";
    if (n === "partial") return "type-delivery";
    if (n.includes("overdue")) return "type-pending";
    if (n === "pending") return "type-pending";
    return "type-pending";
  }
  /* dispatch */
  if (n === "—" || n === "-") return "type-pending";
  if (n.includes("rejected") || n.includes("pending approval")) {
    return "type-pending";
  }
  if (n.includes("delivered")) return "type-completed";
  if (n.includes("dispatched")) return "type-delivery";
  if (
    n === "approved" ||
    n.includes("production") ||
    n.includes("packed") ||
    n.includes("ready for dispatch")
  ) {
    return "type-delivery";
  }
  return "type-pending";
}

function LoadingDashboard() {
  return (
    <div className="wg-box mt-24">
      <div className="body-text">Loading dashboard data from API...</div>
    </div>
  );
}

export function AdminDashboardClient() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/dashboard", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Dashboard API failed");
        return response.json();
      })
      .then((data: DashboardData) => {
        if (active) setDashboard(data);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="wg-box mt-24">
        <div className="body-text text-danger">Dashboard API failed.</div>
      </div>
    );
  }

  if (!dashboard) return <LoadingDashboard />;

  return (
    <>
      <div className="swiper tf-sw-card swiper-box-shadow sarjan-admin-summary">
        <div className="swiper-wrapper">
          {dashboard.summary.map((metric) => (
            <div className="swiper-slide" key={metric.label}>
              <div className="wg-card">
                <div className="content">
                  <div className="title text-secondary">{metric.label}</div>
                  <div className="number">
                    <h4>{metric.value}</h4>
                    <div className="time text-caption-1 text-secondary">
                      {metric.note}
                    </div>
                  </div>
                </div>
                <div className="icon">
                  <i className={metric.icon} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="sw-dots type-circle sw-card-pagination justify-center d-xxl-none d-flex" />
      </div>

      <div className="sarjan-admin-section-grid">
        {dashboard.groups.map((group) => (
          <div className="wg-box" key={group.title}>
            <div className="box-top">
              <h5 className="box-title">{group.title}</h5>
              <div className="sarjan-admin-box-icon">
                <i className={group.icon} />
              </div>
            </div>
            <div className="sarjan-admin-kpi-list">
              {group.items.map((item) => (
                <div className="sarjan-admin-kpi" key={item.label}>
                  <div className="body-text text-secondary">{item.label}</div>
                  <div className="text-title">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AdminDashboardCharts charts={dashboard.charts} />

      <div className="tf-grid-layout tf-grid-layout-1">
        <div className="wg-box">
          <div className="box-top">
            <h5 className="box-title">Recent Orders</h5>
          </div>
          <div className="wg-table table-recent-orders sarjan-dashboard-orders-table">
            <table>
              <thead>
                <tr>
                  <th className="text-title">Order ID</th>
                  <th className="text-title">Client Name</th>
                  <th className="text-title">Date</th>
                  <th className="text-title">Total Amount</th>
                  <th className="text-title">Payment Status</th>
                  <th className="text-title">Dispatch Status</th>
                  <th className="text-title">Approval Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentOrders.map((order) => (
                  <tr className="tf-table-item" key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.client}</td>
                    <td>{order.date}</td>
                    <td>{order.total}</td>
                    <td>
                      <span
                        className={`box-status text-button ${statusClass(order.paymentStatus, "payment")}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`box-status text-button ${statusClass(order.dispatchStatus, "dispatch")}`}
                      >
                        {order.dispatchStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`box-status text-button ${statusClass(order.approvalStatus, "approval")}`}
                      >
                        {order.approvalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="wg-box">
          <div className="box-top">
            <h5 className="box-title">Action Alerts</h5>
          </div>
          <ul className="list-item">
            {dashboard.alerts.map((alert) => (
              <li className="product-item" key={alert.label}>
                <div className="image sarjan-admin-alert-icon">
                  <i className="icon-bell" />
                </div>
                <div className="content">
                  <div className="text-title name text-line-clamp-1">
                    {alert.label}
                  </div>
                  <div className="text-caption-1 sub text-secondary">
                    {alert.detail}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="sarjan-admin-rule-note">
            <div className="text-title">Payment Rule</div>
            <div className="body-text text-secondary">
              Dashboard reads live backend data from clients, orders, products,
              inventory, finance, and inquiries.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
