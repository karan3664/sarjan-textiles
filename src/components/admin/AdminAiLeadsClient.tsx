"use client";

import { useEffect, useState } from "react";
import type { AiLeadRow } from "@/lib/ai-sales/types";

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

function formatInr(value?: number) {
  if (value == null) return "—";
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

function intentClass(intent?: string) {
  if (intent === "abandoned_cart") return "is-abandoned";
  return "is-intent";
}

function formatIntent(intent?: string) {
  if (intent === "abandoned_cart") return "Abandoned cart";
  if (intent === "general") return "General";
  return "Purchase intent";
}

export function AdminAiLeadsClient() {
  const [leads, setLeads] = useState<AiLeadRow[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    abandoned: 0,
    purchaseIntent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/ai-leads?limit=100", {
          credentials: "include",
        });
        const raw = await res.text();
        const json = raw
          ? (JSON.parse(raw) as {
              leads?: AiLeadRow[];
              total?: number;
              abandoned?: number;
              purchaseIntent?: number;
              error?: string;
            })
          : null;
        if (!json) throw new Error("Empty response from AI leads API");
        if (!res.ok) throw new Error(json.error ?? "Failed to load leads");
        if (!cancelled) {
          setLeads(json.leads ?? []);
          setStats({
            total: json.total ?? 0,
            abandoned: json.abandoned ?? 0,
            purchaseIntent: json.purchaseIntent ?? 0,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load AI leads",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-danger mb_0">{error}</p>;
  if (loading) {
    return <p className="sarjan-admin-ai-loading mb_0">Loading AI leads…</p>;
  }

  return (
    <div className="sarjan-admin-ai-leads">
      <div className="sarjan-admin-metrics-grid">
        <MetricCard label="Total leads" value={stats.total} />
        <MetricCard label="Purchase intent" value={stats.purchaseIntent} />
        <MetricCard label="Abandoned cart" value={stats.abandoned} />
      </div>

      <div className="wg-box sarjan-admin-ai-panel sarjan-admin-ai-table">
        <h3 className="sarjan-admin-ai-section__title">Captured leads</h3>
        {leads.length ? (
          <div className="wg-table">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Client</th>
                  <th>Intent</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{new Date(lead.createdAt).toLocaleString("en-IN")}</td>
                    <td title={lead.clientId}>{lead.clientId.slice(0, 8)}…</td>
                    <td>
                      <span
                        className={`sarjan-admin-ai-status ${intentClass(lead.intentType)}`}
                      >
                        {formatIntent(lead.intentType)}
                      </span>
                    </td>
                    <td>
                      {lead.interestedProduct ||
                        lead.productInterest ||
                        lead.productSlugs[0] ||
                        "—"}
                    </td>
                    <td>{lead.quantityInterest ?? "—"}</td>
                    <td>{formatInr(lead.budgetInr)}</td>
                    <td>
                      <span
                        className={`sarjan-admin-ai-status ${statusClass(lead.status)}`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td>{lead.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="sarjan-admin-ai-empty mb_0">
            No AI leads captured yet. Leads appear when shoppers show purchase
            intent or abandon cart via Sarjan AI.
          </p>
        )}
      </div>
    </div>
  );
}
