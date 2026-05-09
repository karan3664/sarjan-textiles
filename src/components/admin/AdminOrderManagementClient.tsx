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

function statusClass(value?: string) {
  if (value === "Delivered" || value === "Dispatched" || value === "Approved" || value === "Paid" || value === "Cleared") return "type-completed";
  if (value === "Rejected" || value === "Bounced" || value === "Overdue") return "type-inactive";
  return "type-pending";
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
        {[
          ["Total Orders", orders.length, "icon-clipboard-text"],
          ["Pending Approval", orders.filter((order) => order.status === "Pending approval").length, "icon-timer"],
          ["Dispatch Pending", orders.filter((order) => ["Approved", "In Production", "Packed", "Ready for Dispatch"].includes(order.status)).length, "icon-send"],
          ["Outstanding", formatInr(orders.reduce((sum, order) => sum + order.outstandingAmount, 0)), "icon-hand-coins"],
        ].map(([label, value, icon]) => (
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
    </>
  );
}
