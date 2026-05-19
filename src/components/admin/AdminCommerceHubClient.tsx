"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HubPayload = {
  snapshot: {
    duplicateOrderSignals: Array<{
      orderA: string;
      orderB: string;
      reason: string;
    }>;
    rapidOrderClients: Array<{
      clientId: string;
      email?: string;
      companyName?: string;
      orders24h: number;
    }>;
    creditAlerts: Array<{
      clientId: string;
      companyName?: string;
      outstandingInr: number;
    }>;
    segmentSummary: Record<string, number>;
    orderCount: number;
    clientCount: number;
  };
  settings: {
    creditOutstandingAlertInr: number;
    contentPublishTwoStep: boolean;
    eInvoiceHookConfigured: boolean;
    eWayHookConfigured: boolean;
  };
};

export function AdminCommerceHubClient() {
  const [data, setData] = useState<HubPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/commerce/hub")
      .then((res) => res.json())
      .then((body) => {
        if (!body?.snapshot) throw new Error(body?.error ?? "Load failed");
        setData(body as HubPayload);
      })
      .catch(() => setError("Could not load commerce hub."));
  }, []);

  if (error) {
    return <p className="text-danger">{error}</p>;
  }
  if (!data) {
    return <p className="text-secondary">Loading commerce signals…</p>;
  }

  const { snapshot, settings } = data;
  const segmentRows = Object.entries(snapshot.segmentSummary).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="layout-wrap">
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="wg-box h-full">
            <h5>Fraud & duplicate orders</h5>
            <p className="text-caption-1 text-secondary">
              Heuristics only — review in{" "}
              <Link href="/admin/orders">Orders</Link> before blocking clients.
            </p>
            <p className="text-button">
              Duplicate pairs: {snapshot.duplicateOrderSignals.length}
            </p>
            <ul className="list-unstyled text-caption-1">
              {snapshot.duplicateOrderSignals.slice(0, 8).map((row) => (
                <li key={`${row.orderA}-${row.orderB}`} className="mb-2">
                  <Link href="/admin/orders">{row.orderA}</Link> ↔{" "}
                  <Link href="/admin/orders">{row.orderB}</Link>
                  <div className="text-secondary">{row.reason}</div>
                </li>
              ))}
            </ul>
            <p className="text-button mt-3">
              High velocity (4+ orders / 24h):{" "}
              {snapshot.rapidOrderClients.length}
            </p>
            <ul className="list-unstyled text-caption-1">
              {snapshot.rapidOrderClients.map((row) => (
                <li key={row.clientId} className="mb-2">
                  <Link href="/admin/customers">
                    {row.companyName ?? row.clientId}
                  </Link>{" "}
                  ({row.orders24h} orders)
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="col-md-6">
          <div className="wg-box h-full">
            <h5>Credit exposure</h5>
            <p className="text-caption-1 text-secondary">
              Unpaid / partially paid pipeline over ₹
              {settings.creditOutstandingAlertInr.toLocaleString("en-IN")}{" "}
              (configure <code>COMMERCE_CREDIT_ALERT_INR</code>).
            </p>
            <ul className="list-unstyled text-caption-1">
              {snapshot.creditAlerts.length ? (
                snapshot.creditAlerts.map((row) => (
                  <li key={row.clientId} className="mb-2">
                    <Link href="/admin/payments">
                      {row.companyName ?? row.clientId}
                    </Link>
                    : ₹{row.outstandingInr.toLocaleString("en-IN")} outstanding
                  </li>
                ))
              ) : (
                <li>No clients above the alert threshold.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="wg-box h-full">
            <h5>Customer segments (B2B)</h5>
            <p className="text-caption-1 text-secondary">
              Approved clients by city — pair with{" "}
              <Link href="/admin/pricing">Client Pricing</Link> for targeted
              lists.
            </p>
            <ul className="list-unstyled text-caption-1">
              {segmentRows.slice(0, 12).map(([city, count]) => (
                <li key={city} className="d-flex justify-content-between mb-1">
                  <span>{city}</span>
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="col-md-6">
          <div className="wg-box h-full">
            <h5>Ops, promos & governance</h5>
            <ul className="text-caption-1">
              <li className="mb-2">
                <strong>Promo scheduling:</strong> use Home / Collections CMS
                and seasonal banners — coordinate start/stop dates with sales.
              </li>
              <li className="mb-2">
                <strong>Price change audit:</strong>{" "}
                <Link href="/admin/audit">Audit logs</Link> capture CMS and
                admin actions.
              </li>
              <li className="mb-2">
                <strong>Two-step content publish:</strong>{" "}
                {settings.contentPublishTwoStep
                  ? "Enabled (CONTENT_PUBLISH_TWO_STEP) — use reviewer + publisher roles in your process."
                  : "Disabled — enable CONTENT_PUBLISH_TWO_STEP when you add an approval step."}
              </li>
              <li className="mb-2">
                <strong>India compliance hooks:</strong> e-invoice{" "}
                {settings.eInvoiceHookConfigured ? "URL set" : "not configured"}
                ; e-way{" "}
                {settings.eWayHookConfigured ? "URL set" : "not configured"} (
                see docs).
              </li>
            </ul>
          </div>
        </div>
      </div>

      <p className="text-caption-1 text-secondary">
        Dataset: {snapshot.orderCount} orders, {snapshot.clientCount} clients.
      </p>
    </div>
  );
}
