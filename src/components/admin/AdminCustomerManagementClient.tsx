"use client";

import { useEffect, useMemo, useState } from "react";
import { IndiaStateCitySelect } from "@/components/shared/IndiaStateCitySelect";
import type { AdminCustomer } from "@/lib/admin-customers";
import { orderStatuses } from "@/lib/order-statuses";
import { AdminOrderItemImage } from "@/components/admin/AdminOrderItemImage";
import { OrderPlacedViaBadge } from "@/components/storefront/OrderPlacedViaBadge";
import {
  printClientOrdersPdf,
  type ClientOrdersPdfInput,
} from "@/lib/admin-report-export";
import { checkClientFieldsUnique } from "@/lib/check-client-unique";
import { resolveOrderItemImage } from "@/lib/product-image-resolve";
import { resolveDispatchAddress } from "@/lib/dispatch-address";
import { isValidGstin, normalizeGstin } from "@/lib/gstin-form";

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
  "Partially Approved": "type-pending",
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
  "Partially Approved",
  "In Production",
  "Packed",
  "Ready for Dispatch",
  "Dispatched",
  "Delivered",
];

const CUSTOMER_ORDERS_PAGE_SIZE = 5;

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

function buildClientOrdersPdf(
  customer: AdminCustomer,
  productImageBySlug: Record<string, string>,
): ClientOrdersPdfInput {
  return {
    companyName: customer.companyName,
    email: customer.email,
    phone: customer.phone,
    gst: customer.gst,
    city: customer.city,
    orderCount: customer.orders.length,
    orders: customer.orders.map((order) => ({
      id: order.id,
      date: formatDate(order.createdAt),
      status: order.status,
      total: formatInr(order.subtotal),
      dispatch:
        resolveDispatchAddress(order.dispatchAddress, {
          companyName: customer.companyName,
          gst: customer.gst,
          city: customer.city,
          phone: customer.phone,
          address: customer.address,
        }) || "Address pending",
      items: order.items.map((item) => ({
        image: resolveOrderItemImage(productImageBySlug, item),
        name: item.name,
        color: item.color,
        sizes: item.sizes?.length ? item.sizes.join(", ") : "-",
        sets: String(item.setQuantity),
        lineTotal: formatInr(item.lineTotal),
      })),
    })),
  };
}

export function AdminCustomerManagementClient({
  initialCustomers,
  productImageBySlug,
}: {
  initialCustomers: AdminCustomer[];
  productImageBySlug: Record<string, string>;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedId, setSelectedId] = useState(initialCustomers[0]?.id ?? "");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [createAttempted, setCreateAttempted] = useState(false);
  const [newClient, setNewClient] = useState({
    companyName: "",
    ownerLegalName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    gst: "",
    password: "",
  });
  const selected =
    customers.find((customer) => customer.id === selectedId) ?? customers[0];

  const selectedOrders = useMemo(() => {
    if (!selected) return [];
    return [...selected.orders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [selected]);

  const ordersTotalPages = Math.max(
    1,
    Math.ceil(selectedOrders.length / CUSTOMER_ORDERS_PAGE_SIZE),
  );
  const safeOrdersPage = Math.min(ordersPage, ordersTotalPages);
  const ordersPageStart = (safeOrdersPage - 1) * CUSTOMER_ORDERS_PAGE_SIZE;
  const ordersPageEnd = Math.min(
    ordersPageStart + CUSTOMER_ORDERS_PAGE_SIZE,
    selectedOrders.length,
  );
  const pagedOrders = selectedOrders.slice(ordersPageStart, ordersPageEnd);

  useEffect(() => {
    setOrdersPage(1);
  }, [selectedId]);

  useEffect(() => {
    setOrdersPage((page) => Math.min(page, ordersTotalPages));
  }, [ordersTotalPages]);

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
    setNotice(
      body.type === "order"
        ? body.action === "partial_approve"
          ? "Partially approving order..."
          : "Updating order status..."
        : "",
    );
    const previousCustomers = customers;
    if (body.type === "order" && body.status && !body.action) {
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
    const gstRaw = newClient.gst.trim();
    const gst = gstRaw ? normalizeGstin(gstRaw) : "";
    if (gstRaw && !isValidGstin(gst)) {
      setNotice("Invalid GST number format.");
      return;
    }
    const phone = newClient.phone.trim();
    if (!newClient.state.trim() || !newClient.city.trim()) {
      setNotice("Select state and city.");
      return;
    }

    setSaving("new-client");
    setNotice("");
    try {
      const unique = await checkClientFieldsUnique({
        email,
        phone: phone || undefined,
        gst: gst || undefined,
      });
      if (!unique.ok) {
        setNotice(unique.error);
        return;
      }
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...newClient,
          companyName,
          email,
          phone,
          gst: gst || undefined,
        }),
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
        state: "",
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
          <IndiaStateCitySelect
            layout="admin"
            state={newClient.state}
            city={newClient.city}
            onStateChange={(value) =>
              setNewClient((current) => ({ ...current, state: value }))
            }
            onCityChange={(value) =>
              setNewClient((current) => ({ ...current, city: value }))
            }
            selectClassName="w-100"
            stateRequired
            cityRequired
          />
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
                  <div className="sarjan-customer-info-cell-legal">
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
                    Order process and dispatch tracking update. Export PDF
                    includes product photos per line item.
                  </div>
                </div>
                <div className="d-flex gap10 align-items-center flex-wrap">
                  <button
                    type="button"
                    className="tf-button style-1"
                    disabled={!selected.orders.length || exportingPdf}
                    onClick={() => {
                      setExportingPdf(true);
                      void printClientOrdersPdf(
                        buildClientOrdersPdf(selected, productImageBySlug),
                      )
                        .catch(() => setNotice("PDF export failed. Try again."))
                        .finally(() => setExportingPdf(false));
                    }}
                  >
                    {exportingPdf ? "Preparing PDF…" : "Export orders PDF"}
                  </button>
                  <span>{selected.orders.length} orders</span>
                </div>
              </div>

              <div className="sarjan-customer-orders">
                {selectedOrders.length ? (
                  pagedOrders.map((order) => (
                    <div className="sarjan-customer-order-card" key={order.id}>
                      <div className="sarjan-customer-order-top">
                        <div>
                          <h6>
                            {order.id}{" "}
                            <OrderPlacedViaBadge placedVia={order.placedVia} />
                          </h6>
                          <div className="text-caption-1 text-secondary">
                            {formatDate(order.createdAt)} / Cheque after{" "}
                            {order.creditDays} days
                          </div>
                        </div>
                        <strong>{formatInr(order.subtotal)}</strong>
                      </div>
                      <div className="sarjan-order-flow">
                        {orderFlow.map((step) => {
                          const statusIndex = orderFlow.indexOf(order.status);
                          const stepIndex = orderFlow.indexOf(step);
                          const done =
                            order.status !== "Rejected" &&
                            statusIndex >= 0 &&
                            stepIndex <= statusIndex;
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
                            {orderStatuses.map((status) => (
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
                      {selected.source === "local" &&
                      order.status === "Pending approval" ? (
                        <div className="d-flex gap10 flex-wrap mt_12">
                          <button
                            type="button"
                            className="tf-button style-1"
                            disabled={saving === order.id}
                            onClick={() =>
                              updateCustomers({
                                type: "order",
                                id: order.id,
                                status: "Approved",
                              })
                            }
                          >
                            Approve full order
                          </button>
                          <button
                            type="button"
                            className="tf-button style-2"
                            disabled={saving === order.id}
                            onClick={() =>
                              updateCustomers({
                                type: "order",
                                id: order.id,
                                action: "partial_approve",
                              })
                            }
                          >
                            Partially approve (available stock)
                          </button>
                          <button
                            type="button"
                            className="tf-button style-3"
                            disabled={saving === order.id}
                            onClick={() =>
                              updateCustomers({
                                type: "order",
                                id: order.id,
                                status: "Rejected",
                              })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                      <div className="text-caption-1 text-secondary">
                        Dispatch:{" "}
                        {resolveDispatchAddress(order.dispatchAddress, {
                          companyName: selected.companyName,
                          gst: selected.gst,
                          city: selected.city,
                          phone: selected.phone,
                          address: selected.address,
                        }) || "Address pending"}
                      </div>
                      {order.items.length ? (
                        <ul className="sarjan-customer-order-lines">
                          {order.items.map((item, itemIndex) => (
                            <li
                              key={`${order.id}-${item.slug}-${itemIndex}`}
                              className="sarjan-customer-order-line"
                            >
                              <AdminOrderItemImage
                                src={resolveOrderItemImage(
                                  productImageBySlug,
                                  item,
                                )}
                                alt={item.name}
                                size={44}
                              />
                              <span className="sarjan-customer-order-line__info">
                                <strong>{item.name}</strong>
                                <span className="text-caption-1 text-secondary">
                                  {item.color}
                                  {item.sizes?.length
                                    ? ` · ${item.sizes.join(", ")}`
                                    : ""}{" "}
                                  · {item.setQuantity} set
                                  {item.setQuantity === 1 ? "" : "s"} ·{" "}
                                  {formatInr(item.lineTotal)}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="sarjan-empty-state">
                    No orders yet for this customer.
                  </div>
                )}
              </div>
              {selectedOrders.length > CUSTOMER_ORDERS_PAGE_SIZE ? (
                <div className="sarjan-products-pagination sarjan-customer-orders-pagination">
                  <div className="body-text text-secondary">
                    Showing <span>{ordersPageStart + 1}</span>–
                    <span>{ordersPageEnd}</span> of{" "}
                    <span>{selectedOrders.length}</span> orders (newest first)
                  </div>
                  <div className="sarjan-products-pagination-actions">
                    <button
                      type="button"
                      className="sarjan-products-page-btn"
                      disabled={safeOrdersPage <= 1}
                      onClick={() =>
                        setOrdersPage((page) => Math.max(1, page - 1))
                      }
                    >
                      Previous
                    </button>
                    <span className="body-text text-secondary">
                      Page {safeOrdersPage} of {ordersTotalPages}
                    </span>
                    <button
                      type="button"
                      className="sarjan-products-page-btn"
                      disabled={safeOrdersPage >= ordersTotalPages}
                      onClick={() =>
                        setOrdersPage((page) =>
                          Math.min(ordersTotalPages, page + 1),
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="sarjan-empty-state">No customers found.</div>
          )}
        </div>
      </div>
    </>
  );
}
