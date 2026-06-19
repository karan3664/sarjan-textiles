"use client";

import { useEffect, useState } from "react";
import type { AiAnalyticsSummary } from "@/lib/ai-chat/types";
import type { AiSalesAnalyticsSummary } from "@/lib/ai-sales/types";

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

function statusClass(status: string) {
  if (status === "converted") return "is-converted";
  if (status === "qualified") return "is-qualified";
  if (status === "lost") return "is-lost";
  return "is-new";
}

function sessionStatusClass(status: string) {
  if (status === "active") return "is-active";
  return "is-closed";
}

export function AdminAiAnalyticsClient() {
  const [summary, setSummary] = useState<AiAnalyticsSummary | null>(null);
  const [sales, setSales] = useState<AiSalesAnalyticsSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [chatRes, salesRes] = await Promise.all([
          fetch("/api/admin/ai-analytics", { credentials: "include" }),
          fetch("/api/admin/ai-sales", { credentials: "include" }),
        ]);
        const chatRaw = await chatRes.text();
        const salesRaw = await salesRes.text();
        const chatData = chatRaw
          ? (JSON.parse(chatRaw) as AiAnalyticsSummary & { error?: string })
          : null;
        const salesData = salesRaw
          ? (JSON.parse(salesRaw) as AiSalesAnalyticsSummary & {
              error?: string;
            })
          : null;
        if (!chatData || !salesData) {
          throw new Error("Empty response from analytics API");
        }
        if (!chatRes.ok) {
          throw new Error(chatData.error ?? "Failed to load chat analytics");
        }
        if (!salesRes.ok) {
          throw new Error(salesData.error ?? "Failed to load sales analytics");
        }
        if (!cancelled) {
          setSummary(chatData);
          setSales(salesData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load analytics",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-danger mb_0">{error}</p>;
  }

  if (!summary || !sales) {
    return (
      <p className="sarjan-admin-ai-loading mb_0">
        Loading Sarjan AI analytics…
      </p>
    );
  }

  return (
    <div className="sarjan-admin-ai-analytics">
      <section className="sarjan-admin-ai-section">
        <div className="wg-box sarjan-admin-ai-panel">
          <h3 className="sarjan-admin-ai-section__title">Sales AI</h3>
          <div className="sarjan-admin-metrics-grid">
            <MetricCard label="AI leads" value={sales.totalLeads} />
            <MetricCard label="New leads" value={sales.newLeads} />
            <MetricCard label="Qualified leads" value={sales.qualifiedLeads} />
            <MetricCard label="Converted leads" value={sales.convertedLeads} />
            <MetricCard
              label="AI conversion"
              value={`${sales.conversionRate}%`}
            />
            <MetricCard
              label="AI revenue"
              value={formatInr(sales.aiRevenueInr)}
            />
            <MetricCard label="AI orders" value={sales.aiOrderCount} />
            <MetricCard
              label="Avg lead budget"
              value={
                sales.averageLeadBudgetInr != null
                  ? formatInr(sales.averageLeadBudgetInr)
                  : "—"
              }
            />
          </div>
        </div>
      </section>

      <section className="sarjan-admin-ai-section">
        <div className="wg-box sarjan-admin-ai-panel">
          <h3 className="sarjan-admin-ai-section__title">Chat sessions</h3>
          <div className="sarjan-admin-metrics-grid">
            <MetricCard label="Total sessions" value={summary.totalSessions} />
            <MetricCard
              label="Active sessions"
              value={summary.activeSessions}
            />
            <MetricCard
              label="Closed sessions"
              value={summary.closedSessions}
            />
            <MetricCard
              label="Average rating"
              value={
                summary.averageRating != null
                  ? summary.averageRating.toFixed(2)
                  : "—"
              }
            />
            <MetricCard label="Rated sessions" value={summary.ratedSessions} />
            <MetricCard
              label="Products viewed"
              value={summary.productsViewed}
            />
            <MetricCard
              label="Products recommended"
              value={summary.productsRecommended}
            />
            <MetricCard label="Add to cart" value={summary.addToCartEvents} />
            <MetricCard label="Orders placed" value={summary.ordersPlaced} />
            <MetricCard
              label="Web sessions"
              value={summary.sessionsBySource.web}
            />
            <MetricCard
              label="App sessions"
              value={summary.sessionsBySource.app}
            />
          </div>
        </div>
      </section>

      <section className="sarjan-admin-ai-section">
        <div className="wg-box sarjan-admin-ai-panel sarjan-admin-ai-table">
          <h3 className="sarjan-admin-ai-section__title">AI leads</h3>
          {sales.recentLeads.length ? (
            <div className="wg-table">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Product interest</th>
                    <th>Quantity</th>
                    <th>Budget</th>
                    <th>Revenue</th>
                    <th>Order</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.recentLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        {new Date(lead.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td title={lead.clientId}>
                        {lead.clientId.slice(0, 8)}…
                      </td>
                      <td>
                        <span
                          className={`sarjan-admin-ai-status ${statusClass(lead.status)}`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td>{lead.productInterest ?? "—"}</td>
                      <td>{lead.quantityInterest ?? "—"}</td>
                      <td>
                        {lead.budgetInr != null
                          ? formatInr(lead.budgetInr)
                          : "—"}
                      </td>
                      <td>
                        {lead.revenueInr != null
                          ? formatInr(lead.revenueInr)
                          : "—"}
                      </td>
                      <td>{lead.convertedOrderId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="sarjan-admin-ai-empty mb_0">No AI leads yet.</p>
          )}
        </div>
      </section>

      <section className="sarjan-admin-ai-section">
        <div className="wg-box sarjan-admin-ai-panel sarjan-admin-ai-table">
          <h3 className="sarjan-admin-ai-section__title">Recent sessions</h3>
          {summary.recentSessions.length ? (
            <div className="wg-table">
              <table>
                <thead>
                  <tr>
                    <th>Started</th>
                    <th>Client</th>
                    <th>Language</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Rating</th>
                    <th>Cart adds</th>
                    <th>Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentSessions.map((session) => (
                    <tr key={session.id}>
                      <td>
                        {new Date(session.startedAt).toLocaleString("en-IN")}
                      </td>
                      <td title={session.clientId}>
                        {session.clientId.slice(0, 8)}…
                      </td>
                      <td>{session.language}</td>
                      <td>{session.source}</td>
                      <td>
                        <span
                          className={`sarjan-admin-ai-status ${sessionStatusClass(session.status)}`}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td>{session.rating ?? "—"}</td>
                      <td>{session.addToCartCount}</td>
                      <td>{session.ordersPlaced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="sarjan-admin-ai-empty mb_0">No chat sessions yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
