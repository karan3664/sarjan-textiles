"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import type { InventoryMovement } from "@/lib/cms-store";

type Operation = InventoryMovement["operation"];

const operationLabels: Record<Operation, string> = {
  add: "Add Stock",
  reduce: "Reduce Stock",
  adjust: "Manual Adjustment",
  transfer: "Transfer Stock",
  return: "Returned Stock",
  damage: "Damaged Stock",
};

function available(product: Product) {
  return Math.max(0, product.stock - product.reserved);
}

function statusInfo(product: Product) {
  if (product.stock <= 0) return { label: "Out of Stock", className: "type-inactive" };
  if (available(product) <= product.moq) return { label: "Low Stock", className: "type-pending" };
  return { label: "Healthy", className: "type-completed" };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function AdminInventoryClient({ initialProducts, initialLogs }: { initialProducts: Product[]; initialLogs: InventoryMovement[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [logs, setLogs] = useState(initialLogs);
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(initialProducts[0]?.slug ?? "");
  const [operation, setOperation] = useState<Operation>("add");
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => !normalized || [product.name, product.sku, product.category, product.fabric].some((value) => value.toLowerCase().includes(normalized)));
  }, [products, query]);

  const selected = products.find((product) => product.slug === selectedSlug) ?? filtered[0] ?? products[0];

  const totals = useMemo(() => {
    return {
      available: products.reduce((sum, product) => sum + available(product), 0),
      reserved: products.reduce((sum, product) => sum + product.reserved, 0),
      sold: products.reduce((sum, product) => sum + product.sold, 0),
      returned: products.reduce((sum, product) => sum + (product.returned ?? 0), 0),
      damaged: products.reduce((sum, product) => sum + (product.damaged ?? 0), 0),
      low: products.filter((product) => available(product) <= product.moq && product.stock > 0).length,
      out: products.filter((product) => product.stock <= 0).length,
    };
  }, [products]);

  const saveMovement = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productSlug: selected.slug, operation, quantity, reference, note }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error ?? "Inventory update failed");
      return;
    }
    setProducts(data.products);
    setLogs(data.inventoryLogs);
    setQuantity("1");
    setReference("");
    setNote("");
    setMessage("Inventory ledger updated.");
  };

  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-products-kpi-grid">
        {[
          ["Available Stock", totals.available, "icon-basket"],
          ["Reserved Stock", totals.reserved, "icon-timer"],
          ["Sold Stock", totals.sold, "icon-chart-bar"],
          ["Returned / Damaged", `${totals.returned} / ${totals.damaged}`, "icon-refresh"],
          ["Low Stock", totals.low, "icon-bell"],
          ["Out of Stock", totals.out, "icon-close"],
        ].map(([label, value, icon]) => (
          <div className="sarjan-home-kpi-card" key={label}>
            <div className="sarjan-home-kpi-icon"><i className={String(icon)} /></div>
            <div><div className="body-text text-secondary">{label}</div><h5>{value}</h5></div>
          </div>
        ))}
      </div>

      <div className="sarjan-inventory-grid">
        <div className="wg-box sarjan-products-list-box">
          {message ? <div className="sarjan-admin-message mb-20">{message}</div> : null}
          <div className="box-top">
            <form className="form-search-2" onSubmit={(event) => event.preventDefault()}>
              <fieldset className="name">
                <input className="show-search" placeholder="Search inventory" value={query} onChange={(event) => setQuery(event.target.value)} />
              </fieldset>
              <div className="button-submit"><button type="submit"><i className="icon-search-1 link" /></button></div>
            </form>
          </div>

          <div className="wg-table table-product-list sarjan-inventory-table">
            <table>
              <thead>
                <tr>
                  <th className="text-title">Product</th>
                  <th className="text-title">Available</th>
                  <th className="text-title">Reserved</th>
                  <th className="text-title">Sold</th>
                  <th className="text-title">Returned</th>
                  <th className="text-title">Damaged</th>
                  <th className="text-title">Alert</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const info = statusInfo(product);
                  return (
                    <tr className={`tf-table-item item-row ${selected?.slug === product.slug ? "sarjan-selected-row" : ""}`} key={product.slug} onClick={() => setSelectedSlug(product.slug)}>
                      <td>
                        <li className="product-item type-1">
                          <div className="image rounded-circle sarjan-product-table-image"><img src={product.images[0]} alt={product.name} /></div>
                          <div className="content">
                            <div className="text-title name text-line-clamp-1">{product.name}</div>
                            <div className="text-caption-1 sub">{product.sku} / MOQ {product.moq}</div>
                          </div>
                        </li>
                      </td>
                      <td>{available(product)}</td>
                      <td>{product.reserved}</td>
                      <td>{product.sold}</td>
                      <td>{product.returned ?? 0}</td>
                      <td>{product.damaged ?? 0}</td>
                      <td><span className={`box-status text-button ${info.className}`}>{info.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="wg-box sarjan-inventory-ops">
          {selected ? (
            <>
              <div className="sarjan-customer-detail-head">
                <div>
                  <div className="body-text text-secondary">{selected.sku}</div>
                  <h5>{selected.name}</h5>
                  <div className="text-caption-1 text-secondary">Available {available(selected)} / Reserved {selected.reserved} / Sold {selected.sold}</div>
                </div>
                <span className={`box-status text-button ${statusInfo(selected).className}`}>{statusInfo(selected).label}</span>
              </div>
              <div className="cols gap22">
                <fieldset>
                  <div className="body-title mb-10">Stock Operation</div>
                  <select value={operation} onChange={(event) => setOperation(event.target.value as Operation)}>
                    {Object.entries(operationLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </fieldset>
                <fieldset>
                  <div className="body-title mb-10">{operation === "adjust" ? "Set Stock To" : "Quantity"}</div>
                  <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                </fieldset>
              </div>
              <fieldset>
                <div className="body-title mb-10">Reference / Transfer To</div>
                <input value={reference} placeholder="PO, challan, warehouse, or reason" onChange={(event) => setReference(event.target.value)} />
              </fieldset>
              <fieldset>
                <div className="body-title mb-10">Internal Note</div>
                <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
              </fieldset>
              <button type="button" className="tf-button text-btn-uppercase" disabled={saving} onClick={saveMovement}>
                {saving ? "Saving..." : "Update Stock Ledger"}
              </button>
            </>
          ) : <div className="sarjan-empty-state">Select product.</div>}
        </div>
      </div>

      <div className="wg-box sarjan-inventory-history">
        <div className="flex flex-wrap justify-between gap14 items-center mb-20">
          <div>
            <h5>Inventory Movement History</h5>
            <div className="body-text text-secondary">Stock in, stock out, manual adjustment, transfer, return, and damage logs.</div>
          </div>
          <div className="box-status text-button type-delivery">{logs.length} Logs</div>
        </div>
        <div className="wg-table table-product-list">
          <table>
            <thead>
              <tr>
                <th className="text-title">Date</th>
                <th className="text-title">Product</th>
                <th className="text-title">Operation</th>
                <th className="text-title">Qty</th>
                <th className="text-title">Before</th>
                <th className="text-title">After</th>
                <th className="text-title">Reference / Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 80).map((log) => (
                <tr className="tf-table-item item-row" key={log.id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td><div className="text-title">{log.productName}</div><div className="text-caption-1 text-secondary">{log.sku}</div></td>
                  <td><span className="box-status text-button type-pending">{operationLabels[log.operation]}</span></td>
                  <td>{log.quantity}</td>
                  <td>{log.beforeStock}</td>
                  <td>{log.afterStock}</td>
                  <td><div>{log.reference || "-"}</div><div className="text-caption-1 text-secondary">{log.note || ""}</div></td>
                </tr>
              ))}
              {!logs.length ? (
                <tr><td colSpan={7}><div className="sarjan-empty-state">No stock movement yet.</div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
