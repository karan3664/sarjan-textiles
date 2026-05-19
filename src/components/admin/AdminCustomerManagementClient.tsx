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

const orderFlow: OrderStatus[] = [
  "Pending approval",
  "Approved",
  "In Production",
  "Packed",
  "Ready for Dispatch",
  "Dispatched",
  "Delivered",
];

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function InlineLoader({ show }: { show: boolean }) {
  return show ? (
    <span className="sarjan-inline-loader" aria-label="Updating" />
  ) : null;
}

export function AdminCustomerManagementClient({
  initialCustomers,
}: {
  initialCustomers: AdminCustomer[];
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedId, setSelectedId] = useState(initialCustomers[0]?.id ?? "");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const [createAttempted, setCreateAttempted] = useState(false);
  const [newClient, setNewClient] = useState({
    companyName: "",
    ownerLegalName: "",
    email: "",
    phone: "",
    city: "",
    gst: "",
    password: "",
  });
  const selected =
    customers.find((customer) => customer.id === selectedId) ?? customers[0];

  const visibleCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesQuery =
        !normalized ||
        [
          customer.companyName,
          customer.ownerLegalName,
          customer.email,
          customer.city,
          customer.gst,
          customer.id,
        ].some((value) => String(value).toLowerCase().includes(normalized));
      const matchesFilter = filter === "all" || customer.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [customers, filter, query]);

  const updateCustomers = async (body: Record<string, string>) => {
    setSaving(body.id ?? "saving");
    setNotice(body.type === "order" ? "Updating order status..." : "");
    const previousCustomers = customers;
    if (body.type === "order") {
      setCustomers((current) =>
        current.map((customer) =>
          customer.source === "local"
            ? {
                ...customer,
                orders: customer.orders.map((order) =>
                  order.id === body.id
                    ? { ...order, status: body.status as OrderStatus }
                    : order,
                ),
              }
            : customer,
        ),
      );
    }
    try {
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        customers?: AdminCustomer[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Update failed");
      if (!data.customers) throw new Error("Customer data missing");
      setCustomers(data.customers);
      setSelectedId(body.type === "client" ? body.id : selectedId);
      setNotice("Customer data updated.");
    } catch (error) {
      if (body.type === "order") setCustomers(previousCustomers);
      setNotice(
        error instanceof Error ? error.message : "Customer update failed",
      );
    } finally {
      setSaving("");
    }
  };

  const createClient = async () => {
    setCreateAttempted(true);
    const companyName = newClient.companyName.trim();
    const email = newClient.email.trim().toLowerCase();
    if (!companyName) {
      setNotice("Trade / business name required.");
      return;
    }
    if (!email) {
      setNotice("Email required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice("Valid email required.");
      return;
    }

    setSaving("new-client");
    setNotice("");
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ ...newClient, companyName, email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        customers?: AdminCustomer[];
        client?: AdminCustomer;
        error?: string;
      };
      if (!res.ok || !data.customers)
        throw new Error(data.error || "Client create failed");
      setCustomers(data.customers);
      if (data.client?.id) setSelectedId(data.client.id);
      setNewClient({
        companyName: "",
        ownerLegalName: "",
        email: "",
        phone: "",
        city: "",
        gst: "",
        password: "",
      });
      setCreateAttempted(false);
      setNotice("Custom client account created.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Client create failed",
      );
    } finally {
      setSaving("");
    }
  };

  const deleteCustomer = async (customer: AdminCustomer) => {
    const openOrders = customer.orders.filter(
      (order) => order.status !== "Delivered",
    );
    if (openOrders.length) {
      setNotice(
        `Cannot delete ${customer.companyName}. Pending orders: ${openOrders.map((order) => `${order.id} (${order.status})`).join(", ")}. Delete allowed only after all orders are Delivered.`,
      );
      return;
    }

    const orderNote = customer.orders.length
      ? ` This also removes ${customer.orders.length} delivered order record(s).`
      : "";
    if (!window.confirm(`Delete ${customer.companyName}?${orderNote}`)) return;

    setSaving(customer.id);
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/customers?id=${encodeURIComponent(customer.id)}`,
        {
          method: "DELETE",
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        customers?: AdminCustomer[];
        error?: string;
      };
      if (!res.ok || !data.customers)
        throw new Error(data.error || "Customer delete failed");
      setCustomers(data.customers);
      setSelectedId(data.customers[0]?.id ?? "");
      setNotice(`${customer.companyName} deleted.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Customer delete failed",
      );
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
          [
            "Pending Approval",
            customers.filter((customer) => customer.status === "pending")
              .length,
            "icon-timer",
          ],
          [
            "Approved",
            customers.filter((customer) => customer.status === "approved")
              .length,
            "icon-sealCheck",
          ],
          [
            "Outstanding",
            formatInr(
              customers.reduce(
                (sum, customer) => sum + customer.outstanding,
                0,
              ),
            ),
            "icon-hand-coins",
          ],
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

      <div className="wg-box mb-30">
        <div className="flex flex-wrap justify-between gap14 items-center mb-20">
          <div>
            <h5>Create Custom Client Account</h5>
            <div className="body-text text-secondary">
              Admin-created clients are approved by default and can place orders
              immediately.
            </div>
          </div>
          <button
            type="button"
            className="tf-button style-1"
            disabled={saving === "new-client"}
            onClick={createClient}
          >
            {saving === "new-client" ? "Creating..." : "Create Client"}
          </button>
        </div>
        <div className="sarjan-client-create-grid grid grid-cols-1 md:grid-cols-3 gap-4">
          <fieldset>
            <div className="body-title mb-10">Trade / business name</div>
            <div className="text-caption-1 text-secondary mb-8">
              Stored as company name (same as GST tradeNam on registration).
            </div>
            <input
              className={
                createAttempted && !newClient.companyName.trim()
                  ? "sarjan-input-error"
                  : ""
              }
              value={newClient.companyName}
              onChange={(event) =>
                setNewClient((current) => ({
                  ...current,
                  companyName: event.target.value,
                }))
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Legal / proprietor name</div>
            <div className="text-caption-1 text-secondary mb-8">
              Optional; saved in client address (same as GST lgnm on
              registration).
            </div>
            <input
              value={newClient.ownerLegalName}
              onChange={(event) =>
                setNewClient((current) => ({
                  ...current,
                  ownerLegalName: event.target.value,
                }))
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Email</div>
            <input
              className={
                createAttempted &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClient.email.trim())
                  ? "sarjan-input-error"
                  : ""
              }
              type="email"
              value={newClient.email}
              onChange={(event) =>
                setNewClient((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Password</div>
            <input
              value={newClient.password}
              placeholder="Auto default if blank"
              onChange={(event) =>
                setNewClient((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Phone</div>
            <input
              value={newClient.phone}
              onChange={(event) =>
                setNewClient((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">City</div>
            <input
              value={newClient.city}
              onChange={(event) =>
                setNewClient((current) => ({
                  ...current,
                  city: event.target.value,
                }))
              }
            />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">GST</div>
            <input
              value={newClient.gst}
              onChange={(event) =>
                setNewClient((current) => ({
                  ...current,
                  gst: event.target.value,
                }))
              }
            />
          </fieldset>
        </div>
        {notice ? (
          <div className="sarjan-mail-notice mt-20">{notice}</div>
        ) : null}
      </div>

      <div className="sarjan-customer-layout">
        <div className="wg-box sarjan-customer-list-box">
          {notice ? (
            <div className="sarjan-mail-notice mb-16">{notice}</div>
          ) : null}
          <div className="box-top">
            <form
              className="form-search-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <fieldset className="name">
                <input
                  type="text"
                  placeholder="Search customer"
                  className="show-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </fieldset>
              <div className="button-submit">
                <button type="submit">
                  <i className="icon-search-1 link" />
                </button>
              </div>
            </form>
            <div className="tf-select">
              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as FilterStatus)
                }
              >
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
                <div className="sarjan-customer-avatar">
                  {customer.companyName.slice(0, 1).toUpperCase()}
                </div>
                <div className="sarjan-customer-card-content">
                  <div className="sarjan-customer-card-top">
                    <h6>{customer.companyName}</h6>
                    <span
                      className={`box-status text-button ${statusClass[customer.status]}`}
                    >
                      {statusLabels[customer.status]}
                    </span>
                  </div>
                  <div className="text-caption-1 text-secondary">
                    {customer.email}
                  </div>
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
                  <div className="body-text text-secondary">
                    Customer Details
                  </div>
                  <h5>{selected.companyName}</h5>
                  <div className="sarjan-customer-detail-email">
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  </div>
                  <div className="text-caption-1 text-secondary">
                    {selected.id} / Joined {formatDate(selected.createdAt)}
                  </div>
                </div>
                <div
                  className={`box-status text-button ${statusClass[selected.status]}`}
                >
                  {statusLabels[selected.status]}
                </div>
              </div>

              <div className="sarjan-customer-info-grid">
                <div className="sarjan-customer-info-cell-email">
                  <span>Email</span>
                  <strong>
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  </strong>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>{selected.phone || "-"}</strong>
                </div>
                <div>
                  <span>GST</span>
                  <strong>{selected.gst || "-"}</strong>
                </div>
                {selected.ownerLegalName ? (
                  <div>
                    <span>Legal / proprietor</span>
                    <strong>{selected.ownerLegalName}</strong>
                  </div>
                ) : null}
                <div>
                  <span>Outstanding</span>
                  <strong>{formatInr(selected.outstanding)}</strong>
                </div>
              </div>

              <div className="sarjan-customer-actions">
                {(["approved", "rejected", "inactive"] as CustomerStatus[]).map(
                  (status) => (
                    <button
                      type="button"
                      className={`tf-button ${status === "approved" ? "" : "style-2"}`}
                      key={status}
                      disabled={!localOnly(selected) || saving === selected.id}
                      onClick={() =>
                        updateCustomers({
                          type: "client",
                          id: selected.id,
                          status,
                        })
                      }
                    >
                      {status === "approved"
                        ? "Approve Customer"
                        : status === "rejected"
                          ? "Reject"
                          : "Deactivate"}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="tf-button style-2 sarjan-danger-button"
                  disabled={!localOnly(selected) || saving === selected.id}
                  onClick={() => deleteCustomer(selected)}
                >
                  Delete Customer
                </button>
                {!localOnly(selected) ? (
                  <span className="text-caption-1 text-secondary">
                    Demo customers read-only. Registered customers can be
                    approved here.
                  </span>
                ) : null}
              </div>

              <div className="sarjan-customer-orders-head">
                <div>
                  <h5>Customer Wise Orders</h5>
                  <div className="body-text text-secondary">
                    Order process and dispatch tracking update.
                  </div>
                </div>
                <span>{selected.orders.length} orders</span>
              </div>

              <div className="sarjan-customer-orders">
                {selected.orders.length ? (
                  selected.orders.map((order) => (
                    <div className="sarjan-customer-order-card" key={order.id}>
                      <div className="sarjan-customer-order-top">
                        <div>
                          <h6>{order.id}</h6>
                          <div className="text-caption-1 text-secondary">
                            {formatDate(order.createdAt)} / Cheque after{" "}
                            {order.creditDays} days
                          </div>
                        </div>
                        <strong>{formatInr(order.subtotal)}</strong>
                      </div>
                      <div className="sarjan-order-flow">
                        {orderFlow.map((step) => {
                          const done =
                            orderFlow.indexOf(step) <=
                              orderFlow.indexOf(order.status) &&
                            order.status !== "Rejected";
                          return (
                            <button
                              type="button"
                              className={done ? "done" : ""}
                              key={step}
                              disabled={
                                selected.source !== "local" ||
                                saving === order.id
                              }
                              onClick={() =>
                                updateCustomers({
                                  type: "order",
                                  id: order.id,
                                  status: step,
                                })
                              }
                            >
                              {step}
                            </button>
                          );
                        })}
                      </div>
                      <div className="sarjan-customer-order-actions">
                        <div className="tf-select">
                          <select
                            value={order.status}
                            disabled={
                              selected.source !== "local" || saving === order.id
                            }
                            onChange={(event) =>
                              updateCustomers({
                                type: "order",
                                id: order.id,
                                status: event.target.value,
                              })
                            }
                          >
                            {(
                              [
                                "Pending approval",
                                "Approved",
                                "Rejected",
                                "In Production",
                                "Packed",
                                "Ready for Dispatch",
                                "Dispatched",
                                "Delivered",
                              ] as OrderStatus[]
                            ).map((status) => (
                              <option value={status} key={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <InlineLoader show={saving === order.id} />
                        </div>
                        <span
                          className={`box-status text-button ${statusClass[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="text-caption-1 text-secondary">
                        Dispatch: {order.dispatchAddress || "Address pending"}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="sarjan-empty-state">
                    No orders yet for this customer.
                  </div>
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
