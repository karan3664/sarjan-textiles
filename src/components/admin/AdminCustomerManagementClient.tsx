"use client";

import { useMemo, useState } from "react";
import type { AdminCustomer } from "@/lib/admin-customers";

type CustomerStatus = AdminCustomer["status"];
type OrderStatus = AdminCustomer["orders"][number]["status"];
type FilterStatus = "all" | CustomerStatus;

const statusLabels: Record<CustomerStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  inactive: "Inactive",
};

const statusClass: Record<string, string> = {
  pending: "type-pending",
  approved: "type-completed",
  rejected: "type-inactive",
  inactive: "type-inactive",
  "Pending approval": "type-pending",
  Approved: "type-completed",
  Rejected: "type-inactive",
  "In Production": "type-pending",
  Packed: "type-pending",
  "Ready for Dispatch": "type-pending",
  Dispatched: "type-completed",
  Delivered: "type-completed",
};

const orderFlow: OrderStatus[] = ["Pending approval", "Approved", "In Production", "Packed", "Ready for Dispatch", "Dispatched", "Delivered"];

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function InlineLoader({ show }: { show: boolean }) {
  return show ? <span className="sarjan-inline-loader" aria-label="Updating" /> : null;
}

export function AdminCustomerManagementClient({ initialCustomers }: { initialCustomers: AdminCustomer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedId, setSelectedId] = useState(initialCustomers[0]?.id ?? "");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const selected = customers.find((customer) => customer.id === selectedId) ?? customers[0];

  const visibleCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesQuery = !normalized || [customer.companyName, customer.email, customer.city, customer.gst, customer.id].some((value) => value.toLowerCase().includes(normalized));
      const matchesFilter = filter === "all" || customer.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [customers, filter, query]);

  const updateCustomers = async (body: Record<string, string>) => {
    setSaving(body.id ?? "saving");
    setNotice("");
    try {
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
      });
      const data = (await res.json().catch(() => ({}))) as { customers?: AdminCustomer[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Update failed");
      if (!data.customers) throw new Error("Customer data missing");
      setCustomers(data.customers);
      setSelectedId(body.type === "client" ? body.id : selectedId);
      setNotice("Customer data updated.");
    } catch (error) {
      setNotice(error instanceof Error && error.name === "TimeoutError" ? "Customer update timed out. Please retry." : error instanceof Error ? error.message : "Customer update failed");
    } finally {
      setSaving("");
    }
  };

  const localOnly = (customer: AdminCustomer) => customer.source === "local";

  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-products-kpi-grid">
        {[
          ["Total Customers", customers.length, "icon-users"],
          ["Pending Approval", customers.filter((customer) => customer.status === "pending").length, "icon-timer"],
          ["Approved", customers.filter((customer) => customer.status === "approved").length, "icon-sealCheck"],
          ["Outstanding", formatInr(customers.reduce((sum, customer) => sum + customer.outstanding, 0)), "icon-hand-coins"],
        ].map(([label, value, icon]) => (
          <div className="sarjan-home-kpi-card" key={label}>
            <div className="sarjan-home-kpi-icon">
              <i className={String(icon)} />
            </div>
            <div>
              <div className="body-text text-secondary">{label}</div>
              <h5>{value}</h5>
            </div>
          </div>
        ))}
      </div>

      <div className="sarjan-customer-layout">
        <div className="wg-box sarjan-customer-list-box">
          {notice ? <div className="sarjan-mail-notice mb-16">{notice}</div> : null}
          <div className="box-top">
            <form className="form-search-2" onSubmit={(event) => event.preventDefault()}>
              <fieldset className="name">
                <input type="text" placeholder="Search customer" className="show-search" value={query} onChange={(event) => setQuery(event.target.value)} />
              </fieldset>
              <div className="button-submit">
                <button type="submit"><i className="icon-search-1 link" /></button>
              </div>
            </form>
            <div className="tf-select">
              <select value={filter} onChange={(event) => setFilter(event.target.value as FilterStatus)}>
                <option value="all">All Customers</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="sarjan-customer-cards">
            {visibleCustomers.map((customer) => (
              <button
                type="button"
                className={`sarjan-customer-card ${selected?.id === customer.id ? "active" : ""}`}
                key={customer.id}
                onClick={() => setSelectedId(customer.id)}
              >
                <div className="sarjan-customer-avatar">{customer.companyName.slice(0, 1).toUpperCase()}</div>
                <div className="sarjan-customer-card-content">
                  <div className="sarjan-customer-card-top">
                    <h6>{customer.companyName}</h6>
                    <span className={`box-status text-button ${statusClass[customer.status]}`}>{statusLabels[customer.status]}</span>
                  </div>
                  <div className="text-caption-1 text-secondary">{customer.email}</div>
                  <div className="sarjan-customer-meta">
                    <span>{customer.city || "City pending"}</span>
                    <span>{customer.orders.length} orders</span>
                    <span>{formatInr(customer.outstanding)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="wg-box sarjan-customer-detail-box">
          {selected ? (
            <>
              <div className="sarjan-customer-detail-head">
                <div>
                  <div className="body-text text-secondary">Customer Details</div>
                  <h5>{selected.companyName}</h5>
                  <div className="text-caption-1 text-secondary">{selected.id} / Joined {formatDate(selected.createdAt)}</div>
                </div>
                <div className={`box-status text-button ${statusClass[selected.status]}`}>{statusLabels[selected.status]}</div>
              </div>

              <div className="sarjan-customer-info-grid">
                <div><span>Email</span><strong>{selected.email}</strong></div>
                <div><span>Phone</span><strong>{selected.phone || "-"}</strong></div>
                <div><span>GST</span><strong>{selected.gst || "-"}</strong></div>
                <div><span>Outstanding</span><strong>{formatInr(selected.outstanding)}</strong></div>
              </div>

              <div className="sarjan-customer-actions">
                {(["approved", "rejected", "inactive"] as CustomerStatus[]).map((status) => (
                  <button
                    type="button"
                    className={`tf-button ${status === "approved" ? "" : "style-2"}`}
                    key={status}
                    disabled={!localOnly(selected) || saving === selected.id}
                    onClick={() => updateCustomers({ type: "client", id: selected.id, status })}
                  >
                    {status === "approved" ? "Approve Customer" : status === "rejected" ? "Reject" : "Deactivate"}
                  </button>
                ))}
                {!localOnly(selected) ? <span className="text-caption-1 text-secondary">Demo customers read-only. Registered customers can be approved here.</span> : null}
              </div>

              <div className="sarjan-customer-orders-head">
                <div>
                  <h5>Customer Wise Orders</h5>
                  <div className="body-text text-secondary">Order process and dispatch tracking update.</div>
                </div>
                <span>{selected.orders.length} orders</span>
              </div>

              <div className="sarjan-customer-orders">
                {selected.orders.length ? selected.orders.map((order) => (
                  <div className="sarjan-customer-order-card" key={order.id}>
                    <div className="sarjan-customer-order-top">
                      <div>
                        <h6>{order.id}</h6>
                        <div className="text-caption-1 text-secondary">{formatDate(order.createdAt)} / Cheque after {order.creditDays} days</div>
                      </div>
                      <strong>{formatInr(order.subtotal)}</strong>
                    </div>
                    <div className="sarjan-order-flow">
                      {orderFlow.map((step) => {
                        const done = orderFlow.indexOf(step) <= orderFlow.indexOf(order.status) && order.status !== "Rejected";
                        return <span className={done ? "done" : ""} key={step}>{step}</span>;
                      })}
                    </div>
                    <div className="sarjan-customer-order-actions">
                      <div className="tf-select">
                        <select
                          value={order.status}
                          disabled={selected.source !== "local" || saving === order.id}
                          onChange={(event) => updateCustomers({ type: "order", id: order.id, status: event.target.value })}
                        >
                          {(["Pending approval", "Approved", "Rejected", "In Production", "Packed", "Ready for Dispatch", "Dispatched", "Delivered"] as OrderStatus[]).map((status) => (
                            <option value={status} key={status}>{status}</option>
                          ))}
                        </select>
                        <InlineLoader show={saving === order.id} />
                      </div>
                      <span className={`box-status text-button ${statusClass[order.status]}`}>{order.status}</span>
                    </div>
                    <div className="text-caption-1 text-secondary">Dispatch: {order.dispatchAddress || "Address pending"}</div>
                  </div>
                )) : (
                  <div className="sarjan-empty-state">No orders yet for this customer.</div>
                )}
              </div>
            </>
          ) : (
            <div className="sarjan-empty-state">No customers found.</div>
          )}
        </div>
      </div>
    </>
  );
}
