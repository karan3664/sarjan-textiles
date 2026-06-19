"use client";

import { useEffect, useState } from "react";

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="sarjan-admin-metric-card">
      <span className="sarjan-admin-metric-card__label">{label}</span>
      <strong className="sarjan-admin-metric-card__value">{value}</strong>
    </div>
  );
}

function formatInr(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

type RevenuePayload = {
  aiOrders: number;
  aiRevenueInr: number;
  aiConversionRate: number;
  totalSessions: number;
  sessionsWithOrder: number;
  leadConversionRate: number;
  totalLeads: number;
  abandonedLeads: number;
  topAiProducts: Array<{
    slug: string;
    name: string;
    orders: number;
    revenueInr: number;
  }>;
  topAiCategories: Array<{
    category: string;
    orders: number;
    revenueInr: number;
  }>;
};

export function AdminAiRevenueClient() {
  const [data, setData] = useState<RevenuePayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/ai-revenue", {
          credentials: "include",
        });
        const raw = await res.text();
        const json = raw
          ? (JSON.parse(raw) as RevenuePayload & { error?: string })
          : null;
        if (!json) throw new Error("Empty response from AI revenue API");
        if (!res.ok) throw new Error(json.error ?? "Failed to load revenue");
        if (!cancelled) setData(json);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load AI revenue",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-danger mb_0">{error}</p>;
  if (!data) {
    return (
      <p className="sarjan-admin-ai-loading mb_0">
        Loading AI revenue dashboard…
      </p>
    );
  }

  return (
    <div className="sarjan-admin-ai-revenue">
      <div className="sarjan-admin-metrics-grid">
        <MetricCard label="AI orders" value={data.aiOrders} />
        <MetricCard label="AI revenue" value={formatInr(data.aiRevenueInr)} />
        <MetricCard
          label="AI conversion rate"
          value={`${data.aiConversionRate}%`}
        />
        <MetricCard label="AI sessions" value={data.totalSessions} />
        <MetricCard
          label="Sessions with order"
          value={data.sessionsWithOrder}
        />
        <MetricCard
          label="Lead conversion"
          value={`${data.leadConversionRate}%`}
        />
        <MetricCard label="Total AI leads" value={data.totalLeads} />
        <MetricCard label="Abandoned intents" value={data.abandonedLeads} />
      </div>

      <div className="sarjan-admin-section-grid sarjan-admin-chart-grid">
        <div className="wg-box sarjan-admin-ai-panel sarjan-admin-ai-table">
          <h3 className="sarjan-admin-ai-section__title">Top AI products</h3>
          {data.topAiProducts.length ? (
            <div className="wg-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topAiProducts.map((row) => (
                    <tr key={row.slug}>
                      <td>{row.name}</td>
                      <td>{row.orders}</td>
                      <td>{formatInr(row.revenueInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="sarjan-admin-ai-empty mb_0">No AI orders yet.</p>
          )}
        </div>

        <div className="wg-box sarjan-admin-ai-panel sarjan-admin-ai-table">
          <h3 className="sarjan-admin-ai-section__title">Top AI categories</h3>
          {data.topAiCategories.length ? (
            <div className="wg-table">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topAiCategories.map((row) => (
                    <tr key={row.category}>
                      <td>{row.category}</td>
                      <td>{row.orders}</td>
                      <td>{formatInr(row.revenueInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="sarjan-admin-ai-empty mb_0">No category data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
