"use client";

import { useEffect, useMemo, useState } from "react";

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
    productDemand: ChartPoint[];
    clientActivity: ChartPoint[];
    dispatchTrend: ChartPoint[];
  };
  recentOrders: RecentOrder[];
  alerts: Array<{ label: string; detail: string }>;
};

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("approved") || normalized.includes("delivered")) return "type-completed";
  if (normalized.includes("ready") || normalized.includes("production")) return "type-delivery";
  return "type-pending";
}

function MiniBarChart({ data }: { data: ChartPoint[] }) {
  const max = useMemo(() => Math.max(...data.map((item) => item.value), 1), [data]);

  return (
    <div className="sarjan-admin-chart" role="list">
      {data.map((item) => (
        <div className="sarjan-admin-chart-row" key={item.label} role="listitem">
          <div className="text-caption-1 text-secondary">{item.label}</div>
          <div className="sarjan-admin-chart-track">
            <span style={{ width: `${Math.max((item.value / max) * 100, 8)}%` }} />
          </div>
          <div className="text-title">{item.value}</div>
        </div>
      ))}
    </div>
  );
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

    fetch("/api/mock/admin/dashboard", { cache: "no-store" })
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

  const chartSections = [
    { title: "Monthly Orders Graph", data: dashboard.charts.monthlyOrders },
    { title: "Product Demand Graph", data: dashboard.charts.productDemand },
    { title: "Client Activity Graph", data: dashboard.charts.clientActivity },
    { title: "Dispatch Trend", data: dashboard.charts.dispatchTrend },
  ];

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
                    <div className="time text-caption-1 text-secondary">{metric.note}</div>
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

      <div className="sarjan-admin-chart-grid">
        {chartSections.map((section) => (
          <div className="wg-box" key={section.title}>
            <div className="box-top">
              <h5 className="box-title">{section.title}</h5>
            </div>
            <MiniBarChart data={section.data} />
          </div>
        ))}
      </div>

      <div className="tf-grid-layout tf-grid-layout-1">
        <div className="wg-box">
          <div className="box-top">
            <h5 className="box-title">Recent Orders</h5>
          </div>
          <div className="wg-table table-recent-orders">
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
                      <div className={`box-status w-100 text-button ${statusClass(order.paymentStatus)}`}>{order.paymentStatus}</div>
                    </td>
                    <td>
                      <div className={`box-status w-100 text-button ${statusClass(order.dispatchStatus)}`}>{order.dispatchStatus}</div>
                    </td>
                    <td>
                      <div className={`box-status w-100 text-button ${statusClass(order.approvalStatus)}`}>{order.approvalStatus}</div>
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
                  <div className="text-title name text-line-clamp-1">{alert.label}</div>
                  <div className="text-caption-1 sub text-secondary">{alert.detail}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="sarjan-admin-rule-note">
            <div className="text-title">Payment Rule</div>
            <div className="body-text text-secondary">No online payment gateway. Payments collected manually after 90 days by cheque.</div>
          </div>
        </div>
      </div>
    </>
  );
}
