"use client";

import { useMemo, useState } from "react";
import type { AdminOrder } from "@/lib/admin-orders";

type Mode = "orders" | "dispatch" | "payments";

const orderStatusOptions = ["Pending approval", "Approved", "Rejected", "In Production", "Packed", "Ready for Dispatch", "Dispatched", "Delivered"];
const paymentStatusOptions = ["Pending", "Partial", "Paid", "Overdue"];
const depositStatusOptions = ["Not deposited", "Deposited", "Cleared", "Bounced"];
type OrderDraft = AdminOrder & Record<string, any>;

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function daysBetween(value?: string) {
  if (!value) return 0;
  const diff = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function agingBucket(order: AdminOrder) {
  const outstanding = order.outstandingAmount ?? 0;
  if (outstanding <= 0) return "Paid";
  const overdueDays = daysBetween(order.creditDueOn);
  if (overdueDays > 90) return "90+ Days";
  if (overdueDays > 60) return "61-90 Days";
  if (overdueDays > 30) return "31-60 Days";
  if (overdueDays > 0) return "1-30 Days";
  return "Not Due";
}

function statusClass(value?: string) {
  if (value === "Delivered" || value === "Dispatched" || value === "Approved" || value === "Paid" || value === "Cleared") return "type-completed";
  if (value === "Rejected" || value === "Bounced" || value === "Overdue") return "type-inactive";
  return "type-pending";
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number | undefined>>) {
  const headers = Object.keys(rows[0] ?? { empty: "" });
  const escape = (value: string | number | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminOrderManagementClient({ initialOrders, mode }: { initialOrders: AdminOrder[]; mode: Mode }) {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialOrders[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");

  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matches = !normalized || [order.id, order.clientName, order.clientEmail, order.status, order.lrNumber, order.chequeNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
      if (mode === "dispatch") return matches && !["Pending approval", "Rejected"].includes(order.status);
      if (mode === "payments") return matches && order.status !== "Rejected";
      return matches;
    });
  }, [mode, orders, query]);

  const selected = visibleOrders.find((order) => order.id === selectedId) ?? visibleOrders[0];
  const draft = selected ? ({ ...selected, ...(drafts[selected.id] ?? {}) } as OrderDraft) : null;
  const dispatchLogs = useMemo(() => orders.flatMap((order) => (order.dispatchHistory ?? []).map((log) => ({ ...log, orderId: order.id, clientName: order.clientName, lrNumber: order.lrNumber }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [orders]);
  const agingRows = useMemo(() => orders.filter((order) => order.status !== "Rejected").map((order) => ({ ...order, bucket: agingBucket(order), overdueDays: daysBetween(order.creditDueOn) })).sort((a, b) => (b.outstandingAmount ?? 0) - (a.outstandingAmount ?? 0)), [orders]);
  const agingTotals = useMemo(() => agingRows.reduce<Record<string, number>>((acc, order) => {
    acc[order.bucket] = (acc[order.bucket] ?? 0) + (order.outstandingAmount ?? 0);
    return acc;
  }, {}), [agingRows]);

  const setDraft = (id: string, patch: Record<string, any>) => {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? {}), ...patch } }));
  };

  const save = async () => {
    if (!draft) return;
    setSaving(draft.id);
    setNotice("");
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(draft),
    });
    const data = await res.json().catch(() => ({}));
    setSaving("");
    if (!res.ok) {
      setNotice(data.error ?? "Order update failed");
      return;
    }
    setOrders(data.orders);
    setDrafts((current) => ({ ...current, [draft.id]: {} }));
    setNotice("Order updated.");
  };

  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-products-kpi-grid">
        {(mode === "payments" ? [
          ["Outstanding", formatInr(orders.reduce((sum, order) => sum + order.outstandingAmount, 0)), "icon-hand-coins"],
          ["Overdue", formatInr(agingRows.filter((order) => order.bucket !== "Not Due" && order.bucket !== "Paid").reduce((sum, order) => sum + order.outstandingAmount, 0)), "icon-timer"],
          ["Partial", orders.filter((order) => order.paymentStatus === "Partial").length, "icon-chart-bar"],
          ["Cheque Pending", orders.filter((order) => order.depositStatus !== "Cleared" && order.outstandingAmount > 0).length, "icon-clipboard-text"],
        ] : mode === "dispatch" ? [
          ["Packed", orders.filter((order) => order.status === "Packed").length, "icon-package"],
          ["Ready", orders.filter((order) => order.status === "Ready for Dispatch").length, "icon-send"],
          ["Dispatched", orders.filter((order) => order.status === "Dispatched").length, "icon-truck"],
          ["Delivered", orders.filter((order) => order.status === "Delivered").length, "icon-sealCheck"],
        ] : [
          ["Total Orders", orders.length, "icon-clipboard-text"],
          ["Pending Approval", orders.filter((order) => order.status === "Pending approval").length, "icon-timer"],
          ["Dispatch Pending", orders.filter((order) => ["Approved", "In Production", "Packed", "Ready for Dispatch"].includes(order.status)).length, "icon-send"],
          ["Outstanding", formatInr(orders.reduce((sum, order) => sum + order.outstandingAmount, 0)), "icon-hand-coins"],
        ]).map(([label, value, icon]) => (
          <div className="sarjan-home-kpi-card" key={label}>
            <div className="sarjan-home-kpi-icon"><i className={String(icon)} /></div>
            <div><div className="body-text text-secondary">{label}</div><h5>{value}</h5></div>
          </div>
        ))}
      </div>

      <div className="sarjan-order-admin-layout">
        <div className="wg-box">
          {notice ? <div className="sarjan-mail-notice mb-16">{notice}</div> : null}
          <div className="box-top">
            <form className="form-search-2" onSubmit={(event) => event.preventDefault()}>
              <fieldset className="name"><input className="show-search" placeholder="Search orders" value={query} onChange={(event) => setQuery(event.target.value)} /></fieldset>
              <div className="button-submit"><button type="submit"><i className="icon-search-1 link" /></button></div>
            </form>
            <button type="button" className="tf-button" onClick={() => downloadCsv(`${mode}-orders.csv`, visibleOrders.map((order) => ({
              id: order.id,
              client: order.clientName,
              status: order.status,
              paymentStatus: order.paymentStatus,
              dispatchDate: order.dispatchDate,
              lrNumber: order.lrNumber,
              total: order.subtotal,
              outstanding: order.outstandingAmount,
            })))}>
              Export CSV
            </button>
          </div>
          <div className="sarjan-order-list">
            {visibleOrders.map((order) => (
              <button type="button" className={`sarjan-order-list-item ${selected?.id === order.id ? "active" : ""}`} key={order.id} onClick={() => setSelectedId(order.id)}>
                <div><h6>{order.id}</h6><p>{order.clientName}</p></div>
                <div><strong>{formatInr(order.subtotal)}</strong><span className={`box-status text-button ${statusClass(mode === "payments" ? order.paymentStatus : order.status)}`}>{mode === "payments" ? order.paymentStatus ?? "Pending" : order.status}</span></div>
              </button>
            ))}
            {!visibleOrders.length ? <div className="sarjan-empty-state">No orders found.</div> : null}
          </div>
        </div>

        <div className="wg-box">
          {draft ? (
            <div className="sarjan-order-editor">
              <div className="sarjan-customer-detail-head">
                <div><div className="body-text text-secondary">{draft.clientName}</div><h5>{draft.id}</h5><div className="text-caption-1 text-secondary">Created {formatDate(draft.createdAt)} / Due {formatDate(draft.creditDueOn)}</div></div>
                <strong>{formatInr(draft.subtotal)}</strong>
              </div>

              {mode === "orders" ? (
                <>
                  <div className="cols gap22">
                    <fieldset><div className="body-title mb-10">Approval / Process Status</div><select value={draft.status} onChange={(event) => setDraft(draft.id, { status: event.target.value as AdminOrder["status"] })}>{orderStatusOptions.map((item) => <option key={item}>{item}</option>)}</select></fieldset>
                    <fieldset><div className="body-title mb-10">Admin Remark</div><input value={draft.approvalRemark ?? ""} onChange={(event) => setDraft(draft.id, { approvalRemark: event.target.value })} /></fieldset>
                  </div>
                  <fieldset><div className="body-title mb-10">Client / Internal Notes</div><textarea rows={4} value={draft.note ?? ""} onChange={(event) => setDraft(draft.id, { note: event.target.value })} /></fieldset>
                </>
              ) : null}

              {mode === "dispatch" ? (
                <>
                  <div className="cols gap22">
                    <fieldset><div className="body-title mb-10">Dispatch Status</div><select value={draft.status} onChange={(event) => setDraft(draft.id, { status: event.target.value as AdminOrder["status"] })}>{orderStatusOptions.map((item) => <option key={item}>{item}</option>)}</select></fieldset>
                    <fieldset><div className="body-title mb-10">Dispatch Date</div><input type="date" value={draft.dispatchDate ?? ""} onChange={(event) => setDraft(draft.id, { dispatchDate: event.target.value })} /></fieldset>
                    <fieldset><div className="body-title mb-10">LR Number</div><input value={draft.lrNumber ?? ""} onChange={(event) => setDraft(draft.id, { lrNumber: event.target.value })} /></fieldset>
                    <fieldset><div className="body-title mb-10">Vehicle Details</div><input value={draft.vehicleDetails ?? ""} onChange={(event) => setDraft(draft.id, { vehicleDetails: event.target.value })} /></fieldset>
                  </div>
                  <fieldset><div className="body-title mb-10">Transport / Courier Details</div><input value={draft.transportDetails ?? draft.courierDetails ?? ""} onChange={(event) => setDraft(draft.id, { transportDetails: event.target.value, courierDetails: event.target.value })} /></fieldset>
                  <fieldset><div className="body-title mb-10">Tracking Notes</div><textarea rows={4} value={draft.trackingNotes ?? ""} onChange={(event) => setDraft(draft.id, { trackingNotes: event.target.value })} /></fieldset>
                  <div className="sarjan-admin-mini-ledger">
                    <h6>Dispatch History</h6>
                    {(draft.dispatchHistory ?? []).slice().reverse().map((log: any, index: number) => (
                      <div className="sarjan-ledger-line" key={`${log.createdAt}-${index}`}>
                        <span className={`box-status text-button ${statusClass(log.status)}`}>{log.status}</span>
                        <div><strong>{formatDate(log.createdAt)}</strong><p>{log.note || "Status updated."}</p></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {mode === "payments" ? (
                <>
                  <div className="cols gap22">
                    <fieldset><div className="body-title mb-10">Payment Status</div><select value={draft.paymentStatus ?? "Pending"} onChange={(event) => setDraft(draft.id, { paymentStatus: event.target.value as AdminOrder["paymentStatus"] })}>{paymentStatusOptions.map((item) => <option key={item}>{item}</option>)}</select></fieldset>
                    <fieldset><div className="body-title mb-10">Paid Amount</div><input type="number" value={draft.paidAmount ?? 0} onChange={(event) => setDraft(draft.id, { paidAmount: Number(event.target.value) })} /></fieldset>
                    <fieldset><div className="body-title mb-10">Cheque Number</div><input value={draft.chequeNumber ?? ""} onChange={(event) => setDraft(draft.id, { chequeNumber: event.target.value })} /></fieldset>
                    <fieldset><div className="body-title mb-10">Cheque Date</div><input type="date" value={draft.chequeDate ?? ""} onChange={(event) => setDraft(draft.id, { chequeDate: event.target.value })} /></fieldset>
                    <fieldset><div className="body-title mb-10">Deposit Status</div><select value={draft.depositStatus ?? "Not deposited"} onChange={(event) => setDraft(draft.id, { depositStatus: event.target.value as AdminOrder["depositStatus"] })}>{depositStatusOptions.map((item) => <option key={item}>{item}</option>)}</select></fieldset>
                    <fieldset><div className="body-title mb-10">Payment Received At</div><input type="date" value={draft.paymentReceivedAt ?? ""} onChange={(event) => setDraft(draft.id, { paymentReceivedAt: event.target.value })} /></fieldset>
                  </div>
                  <fieldset><div className="body-title mb-10">Bank Details</div><textarea rows={3} value={draft.bankDetails ?? ""} onChange={(event) => setDraft(draft.id, { bankDetails: event.target.value })} /></fieldset>
                  <div className="sarjan-payment-ledger-card">
                    <div><span>Invoice Value</span><strong>{formatInr(draft.subtotal)}</strong></div>
                    <div><span>Paid</span><strong>{formatInr(draft.paidAmount ?? 0)}</strong></div>
                    <div><span>Outstanding</span><strong>{formatInr(draft.outstandingAmount ?? Math.max(0, draft.subtotal - (draft.paidAmount ?? 0)))}</strong></div>
                    <div><span>Aging</span><strong>{agingBucket(draft)}</strong></div>
                  </div>
                </>
              ) : null}

              <div className="sarjan-order-items">
                <h6>Ordered Products</h6>
                {draft.items.length ? draft.items.map((item) => (
                  <div key={`${item.slug}-${item.color}`}>
                    <span>{item.name} / {item.color} / {item.sizes.join(", ")}</span>
                    <strong>{item.setQuantity} sets / {formatInr(item.lineTotal)}</strong>
                  </div>
                )) : <p className="text-secondary">Demo item details pending.</p>}
              </div>

              <button type="button" className="tf-button" disabled={saving === draft.id || draft.source === "demo"} onClick={save}>
                {draft.source === "demo" ? "Demo Order Read Only" : saving === draft.id ? "Saving..." : "Save Updates"}
              </button>
            </div>
          ) : <div className="sarjan-empty-state">Select order.</div>}
        </div>
      </div>

      {mode === "dispatch" ? (
        <div className="wg-box sarjan-report-box">
          <div className="flex flex-wrap justify-between gap14 items-center mb-20">
            <div>
              <h5>Dispatch Logs</h5>
              <div className="body-text text-secondary">LR, courier, vehicle, tracking notes, and full status timeline.</div>
            </div>
            <div className="d-flex gap10 flex-wrap">
              <button type="button" className="tf-button" onClick={() => downloadCsv("dispatch-logs.csv", dispatchLogs.map((log) => ({
                date: formatDate(log.createdAt),
                order: log.orderId,
                client: log.clientName,
                status: log.status,
                lrNumber: log.lrNumber,
                note: log.note,
              })))}>Export CSV</button>
              <div className="box-status text-button type-delivery">{dispatchLogs.length} Logs</div>
            </div>
          </div>
          <div className="wg-table table-product-list">
            <table>
              <thead><tr><th className="text-title">Date</th><th className="text-title">Order</th><th className="text-title">Client</th><th className="text-title">Status</th><th className="text-title">LR</th><th className="text-title">Note</th></tr></thead>
              <tbody>
                {dispatchLogs.map((log, index) => (
                  <tr className="tf-table-item item-row" key={`${log.orderId}-${log.createdAt}-${index}`}>
                    <td>{formatDate(log.createdAt)}</td>
                    <td>{log.orderId}</td>
                    <td>{log.clientName}</td>
                    <td><span className={`box-status text-button ${statusClass(log.status)}`}>{log.status}</span></td>
                    <td>{log.lrNumber || "-"}</td>
                    <td>{log.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {mode === "payments" ? (
        <>
          <div className="sarjan-aging-grid">
            {["Not Due", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days"].map((bucket) => (
              <div className="sarjan-aging-card" key={bucket}>
                <span>{bucket}</span>
                <strong>{formatInr(agingTotals[bucket] ?? 0)}</strong>
              </div>
            ))}
          </div>
          <div className="wg-box sarjan-report-box">
            <div className="flex flex-wrap justify-between gap14 items-center mb-20">
              <div>
                <h5>Payment Ledger Aging Report</h5>
                <div className="body-text text-secondary">90-day cheque workflow, pending dues, overdue buckets, partial payments, and deposit status.</div>
              </div>
              <div className="d-flex gap10 flex-wrap">
                <button type="button" className="tf-button" onClick={() => downloadCsv("payment-aging-report.csv", agingRows.map((order) => ({
                  order: order.id,
                  client: order.clientName,
                  dueDate: formatDate(order.creditDueOn),
                  aging: order.bucket,
                  invoice: order.subtotal,
                  paid: order.paidAmount ?? 0,
                  outstanding: order.outstandingAmount ?? 0,
                  cheque: order.chequeNumber,
                  deposit: order.depositStatus,
                })))}>Export CSV</button>
                <div className="box-status text-button type-delivery">{agingRows.length} Orders</div>
              </div>
            </div>
            <div className="wg-table table-product-list">
              <table>
                <thead><tr><th className="text-title">Order</th><th className="text-title">Client</th><th className="text-title">Due Date</th><th className="text-title">Aging</th><th className="text-title">Invoice</th><th className="text-title">Paid</th><th className="text-title">Outstanding</th><th className="text-title">Cheque</th><th className="text-title">Deposit</th></tr></thead>
                <tbody>
                  {agingRows.map((order) => (
                    <tr className="tf-table-item item-row" key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.clientName}</td>
                      <td>{formatDate(order.creditDueOn)}</td>
                      <td><span className={`box-status text-button ${order.bucket === "Paid" || order.bucket === "Not Due" ? "type-completed" : "type-inactive"}`}>{order.bucket}</span></td>
                      <td>{formatInr(order.subtotal)}</td>
                      <td>{formatInr(order.paidAmount ?? 0)}</td>
                      <td>{formatInr(order.outstandingAmount ?? 0)}</td>
                      <td>{order.chequeNumber || "-"}</td>
                      <td><span className={`box-status text-button ${statusClass(order.depositStatus)}`}>{order.depositStatus ?? "Not deposited"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
