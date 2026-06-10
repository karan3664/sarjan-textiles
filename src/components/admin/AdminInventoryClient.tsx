"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import type { InventoryMovement } from "@/lib/cms-store";
import {
  isProductPlaceholderImage,
  PRODUCT_PLACEHOLDER_IMAGE,
  productGalleryImages,
} from "@/lib/product-placeholder-image";

type Operation = InventoryMovement["operation"];
type InventorySortKey =
  | "product"
  | "available"
  | "reserved"
  | "sold"
  | "returned"
  | "damaged"
  | "alert";
type SortDirection = "asc" | "desc";

const operationLabels: Record<Operation, string> = {
  add: "Add Stock",
  reduce: "Reduce Stock",
  adjust: "Manual Adjustment",
  transfer: "Transfer Stock",
  return: "Returned Stock",
  damage: "Damaged Stock",
};

function stockValue(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function available(product: Product) {
  return Math.max(0, stockValue(product.stock) - stockValue(product.reserved));
}

function statusInfo(product: Product) {
  const stock = stockValue(product.stock);
  const moq = stockValue(product.moq);
  if (stock <= 0) return { label: "Out of Stock", className: "type-inactive" };
  if (available(product) <= moq)
    return { label: "Low Stock", className: "type-pending" };
  return { label: "Healthy", className: "type-completed" };
}

function productThumb(product: Product) {
  return productGalleryImages(product.images)[0] ?? PRODUCT_PLACEHOLDER_IMAGE;
}

function searchText(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function operationLabel(operation: InventoryMovement["operation"]) {
  return operationLabels[operation] ?? operation;
}

function downloadCsv(
  filename: string,
  rows: Array<Record<string, string | number | undefined>>,
) {
  const headers = Object.keys(rows[0] ?? { empty: "" });
  const escape = (value: string | number | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escape(row[header])).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadXlsx(
  filename: string,
  rows: Array<Record<string, string | number | undefined>>,
) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows),
    "Inventory",
  );
  XLSX.writeFile(workbook, filename);
}

function printPdf(
  title: string,
  rows: Array<Record<string, string | number | undefined>>,
) {
  const headers = Object.keys(rows[0] ?? { empty: "" });
  const table = `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${String(row[header] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const popup = window.open("", "_blank", "width=1200,height=800");
  if (!popup) return;
  popup.document.write(
    `<html><head><title>${title}</title><style>body{font-family:Arial;padding:24px;color:#181818}h1{font-size:22px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}</style></head><body><h1>${title}</h1>${table}</body></html>`,
  );
  popup.document.close();
  popup.print();
}

function visiblePageNumbers(totalPages: number, currentPage: number) {
  return Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (item) =>
      item === 1 || item === totalPages || Math.abs(item - currentPage) <= 1,
  );
}

function sortValue(product: Product, key: InventorySortKey) {
  if (key === "product") return searchText(product.name);
  if (key === "available") return available(product);
  if (key === "reserved") return stockValue(product.reserved);
  if (key === "sold") return stockValue(product.sold);
  if (key === "returned") return stockValue(product.returned);
  if (key === "damaged") return stockValue(product.damaged);
  return statusInfo(product).label;
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: InventorySortKey;
  activeKey: InventorySortKey;
  direction: SortDirection;
  onSort: (key: InventorySortKey, direction: SortDirection) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <div className={`sarjan-table-sort${active ? " active" : ""}`}>
      <span>{label}</span>
      <span className="sarjan-table-sort-actions">
        <button
          type="button"
          className={active && direction === "asc" ? "active" : ""}
          aria-label={`Sort ${label} ascending`}
          onClick={() => onSort(sortKey, "asc")}
        >
          <i className="icon-chevron-up" />
        </button>
        <button
          type="button"
          className={active && direction === "desc" ? "active" : ""}
          aria-label={`Sort ${label} descending`}
          onClick={() => onSort(sortKey, "desc")}
        >
          <i className="icon-chevron-down" />
        </button>
      </span>
    </div>
  );
}

export function AdminInventoryClient({
  initialProducts,
  initialLogs,
}: {
  initialProducts: Product[];
  initialLogs: InventoryMovement[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [logs, setLogs] = useState(initialLogs);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<InventorySortKey>("product");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(8);
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [selectedSlug, setSelectedSlug] = useState(
    initialProducts[0]?.slug ?? "",
  );
  const [operation, setOperation] = useState<Operation>("add");
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = products.filter(
      (product) =>
        !normalized ||
        [product.name, product.sku, product.category, product.fabric].some(
          (value) => searchText(value).includes(normalized),
        ),
    );
    return [...matches].sort((a, b) => {
      const first = sortValue(a, sortKey);
      const second = sortValue(b, sortKey);
      const result =
        typeof first === "number" && typeof second === "number"
          ? first - second
          : String(first).localeCompare(String(second));
      return sortDirection === "asc" ? result : -result;
    });
  }, [products, query, sortDirection, sortKey]);

  const updateSort = (key: InventorySortKey, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  useEffect(() => {
    setProductPage(1);
  }, [productPageSize, query, sortDirection, sortKey]);

  useEffect(() => {
    setLogPage(1);
  }, [logPageSize, logs.length]);

  const totalProductPages = Math.max(
    1,
    Math.ceil(filtered.length / productPageSize),
  );
  const currentProductPage = Math.min(productPage, totalProductPages);
  const productStartIndex = filtered.length
    ? (currentProductPage - 1) * productPageSize
    : 0;
  const productEndIndex = Math.min(
    productStartIndex + productPageSize,
    filtered.length,
  );
  const paginatedProducts = filtered.slice(productStartIndex, productEndIndex);
  const productPages = visiblePageNumbers(
    totalProductPages,
    currentProductPage,
  );

  const totalLogPages = Math.max(1, Math.ceil(logs.length / logPageSize));
  const currentLogPage = Math.min(logPage, totalLogPages);
  const logStartIndex = logs.length ? (currentLogPage - 1) * logPageSize : 0;
  const logEndIndex = Math.min(logStartIndex + logPageSize, logs.length);
  const paginatedLogs = logs.slice(logStartIndex, logEndIndex);
  const logPages = visiblePageNumbers(totalLogPages, currentLogPage);

  const selected =
    products.find((product) => product.slug === selectedSlug) ??
    filtered[0] ??
    products[0];
  const ledgerRows = () =>
    logs.map((log) => ({
      date: formatDate(log.createdAt),
      product: log.productName,
      sku: log.sku,
      operation: operationLabel(log.operation),
      quantity: log.quantity,
      beforeStock: log.beforeStock,
      afterStock: log.afterStock,
      reference: log.reference,
      note: log.note,
      actor: log.actor,
    }));

  const totals = useMemo(() => {
    return {
      available: products.reduce((sum, product) => sum + available(product), 0),
      reserved: products.reduce(
        (sum, product) => sum + stockValue(product.reserved),
        0,
      ),
      sold: products.reduce(
        (sum, product) => sum + stockValue(product.sold),
        0,
      ),
      returned: products.reduce(
        (sum, product) => sum + stockValue(product.returned),
        0,
      ),
      damaged: products.reduce(
        (sum, product) => sum + stockValue(product.damaged),
        0,
      ),
      low: products.filter(
        (product) =>
          available(product) <= stockValue(product.moq) &&
          stockValue(product.stock) > 0,
      ).length,
      out: products.filter((product) => stockValue(product.stock) <= 0).length,
    };
  }, [products]);

  const saveMovement = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productSlug: selected.slug,
        operation,
        quantity,
        reference,
        note,
      }),
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
          [
            "Returned / Damaged",
            `${totals.returned} / ${totals.damaged}`,
            "icon-refresh",
          ],
          ["Low Stock", totals.low, "icon-bell"],
          ["Out of Stock", totals.out, "icon-close"],
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

      <div className="sarjan-inventory-grid">
        <div className="wg-box sarjan-products-list-box">
          {message ? (
            <div className="sarjan-admin-message mb-20">{message}</div>
          ) : null}
          <div className="box-top sarjan-inventory-toolbar">
            <form
              className="form-search-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <fieldset className="name">
                <input
                  className="show-search"
                  placeholder="Search inventory"
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
          </div>

          <div className="wg-table sarjan-inventory-table">
            <table>
              <thead>
                <tr>
                  <th className="text-title">
                    <SortHeader
                      label="Product"
                      sortKey="product"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={updateSort}
                    />
                  </th>
                  <th className="text-title">
                    <SortHeader
                      label="Avail."
                      sortKey="available"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={updateSort}
                    />
                  </th>
                  <th className="text-title">
                    <SortHeader
                      label="Reserved"
                      sortKey="reserved"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={updateSort}
                    />
                  </th>
                  <th className="text-title">
                    <SortHeader
                      label="Sold"
                      sortKey="sold"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={updateSort}
                    />
                  </th>
                  <th className="text-title">
                    <SortHeader
                      label="Return"
                      sortKey="returned"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={updateSort}
                    />
                  </th>
                  <th className="text-title">
                    <SortHeader
                      label="Damage"
                      sortKey="damaged"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={updateSort}
                    />
                  </th>
                  <th className="text-title">
                    <SortHeader
                      label="Alert"
                      sortKey="alert"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={updateSort}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => {
                  const info = statusInfo(product);
                  return (
                    <tr
                      className={`tf-table-item item-row ${selected?.slug === product.slug ? "sarjan-selected-row" : ""}`}
                      key={product.slug}
                      onClick={() => setSelectedSlug(product.slug)}
                    >
                      <td>
                        <li className="product-item type-1">
                          <div
                            className={`image rounded-circle sarjan-product-table-image${
                              isProductPlaceholderImage(productThumb(product))
                                ? " sarjan-product-table-image--placeholder"
                                : ""
                            }`}
                          >
                            <img
                              src={productThumb(product)}
                              alt={product.name}
                              className={
                                isProductPlaceholderImage(productThumb(product))
                                  ? "sarjan-product-img-placeholder"
                                  : undefined
                              }
                            />
                          </div>
                          <div className="content">
                            <div className="text-title name text-line-clamp-1">
                              {product.name}
                            </div>
                            <div className="text-caption-1 sub">
                              {product.sku} / MOQ {product.moq}
                            </div>
                          </div>
                        </li>
                      </td>
                      <td>{available(product)}</td>
                      <td>{stockValue(product.reserved)}</td>
                      <td>{stockValue(product.sold)}</td>
                      <td>{stockValue(product.returned)}</td>
                      <td>{stockValue(product.damaged)}</td>
                      <td>
                        <span
                          className={`box-status text-button ${info.className}`}
                        >
                          {info.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="sarjan-empty-state">
                        No products found.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {filtered.length > productPageSize ? (
            <div className="sarjan-products-pagination sarjan-inventory-pagination">
              <div className="body-text text-secondary">
                Showing <span>{productStartIndex + 1}</span>-
                <span>{productEndIndex}</span> of <span>{filtered.length}</span>{" "}
                products
              </div>
              <div className="sarjan-products-pagination-actions">
                <div className="tf-select sarjan-products-page-size">
                  <select
                    value={productPageSize}
                    onChange={(event) =>
                      setProductPageSize(Number(event.target.value))
                    }
                  >
                    <option value={8}>8 / page</option>
                    <option value={12}>12 / page</option>
                    <option value={20}>20 / page</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="sarjan-products-page-btn"
                  disabled={currentProductPage === 1}
                  onClick={() =>
                    setProductPage((value) => Math.max(1, value - 1))
                  }
                >
                  <i className="icon icon-chevron-left" />
                </button>
                <div className="sarjan-products-page-list">
                  {productPages.map((pageNumber, index) => {
                    const previous = productPages[index - 1];
                    return (
                      <span
                        className="sarjan-products-page-group"
                        key={pageNumber}
                      >
                        {previous && pageNumber - previous > 1 ? (
                          <span className="sarjan-products-page-ellipsis">
                            ...
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className={`sarjan-products-page-btn ${pageNumber === currentProductPage ? "active" : ""}`}
                          onClick={() => setProductPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="sarjan-products-page-btn"
                  disabled={currentProductPage === totalProductPages}
                  onClick={() =>
                    setProductPage((value) =>
                      Math.min(totalProductPages, value + 1),
                    )
                  }
                >
                  <i className="icon icon-chevron-right" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="wg-box sarjan-inventory-ops">
          {selected ? (
            <>
              <div className="sarjan-customer-detail-head">
                <div>
                  <div className="body-text text-secondary">{selected.sku}</div>
                  <h5>{selected.name}</h5>
                  <div className="text-caption-1 text-secondary">
                    Available {available(selected)} / Reserved{" "}
                    {stockValue(selected.reserved)} / Sold{" "}
                    {stockValue(selected.sold)}
                  </div>
                </div>
                <span
                  className={`box-status text-button ${statusInfo(selected).className}`}
                >
                  {statusInfo(selected).label}
                </span>
              </div>
              <div className="cols gap22">
                <fieldset>
                  <div className="body-title mb-10">Stock Operation</div>
                  <select
                    value={operation}
                    onChange={(event) =>
                      setOperation(event.target.value as Operation)
                    }
                  >
                    {Object.entries(operationLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </fieldset>
                <fieldset>
                  <div className="body-title mb-10">
                    {operation === "adjust" ? "Set Stock To" : "Quantity"}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </fieldset>
              </div>
              <fieldset>
                <div className="body-title mb-10">Reference / Transfer To</div>
                <input
                  value={reference}
                  placeholder="PO, challan, warehouse, or reason"
                  onChange={(event) => setReference(event.target.value)}
                />
              </fieldset>
              <fieldset>
                <div className="body-title mb-10">Internal Note</div>
                <textarea
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </fieldset>
              <button
                type="button"
                className="tf-button text-btn-uppercase"
                disabled={saving}
                onClick={saveMovement}
              >
                {saving ? "Saving..." : "Update Stock Ledger"}
              </button>
            </>
          ) : (
            <div className="sarjan-empty-state">Select product.</div>
          )}
        </div>
      </div>

      <div className="wg-box sarjan-inventory-history">
        <div className="flex flex-wrap justify-between gap14 items-center mb-20">
          <div>
            <h5>Inventory Movement History</h5>
            <div className="body-text text-secondary">
              Stock in, stock out, manual adjustment, transfer, return, and
              damage logs.
            </div>
          </div>
          <div className="d-flex gap10 flex-wrap">
            <button
              type="button"
              className="tf-button"
              onClick={() => downloadCsv("inventory-ledger.csv", ledgerRows())}
            >
              CSV
            </button>
            <button
              type="button"
              className="tf-button"
              onClick={() =>
                downloadXlsx("inventory-ledger.xlsx", ledgerRows())
              }
            >
              Excel
            </button>
            <button
              type="button"
              className="tf-button"
              onClick={() => printPdf("Inventory Ledger", ledgerRows())}
            >
              PDF
            </button>
            <div className="box-status text-button type-delivery">
              {logs.length} Logs
            </div>
          </div>
        </div>
        <div className="wg-table sarjan-inventory-history-table">
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
              {paginatedLogs.map((log) => (
                <tr className="tf-table-item item-row" key={log.id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>
                    <div className="text-title">{log.productName}</div>
                    <div className="text-caption-1 text-secondary">
                      {log.sku}
                    </div>
                  </td>
                  <td>
                    <span className="box-status text-button type-pending">
                      {operationLabel(log.operation)}
                    </span>
                  </td>
                  <td>{log.quantity}</td>
                  <td>{log.beforeStock}</td>
                  <td>{log.afterStock}</td>
                  <td>
                    <div>{log.reference || "-"}</div>
                    <div className="text-caption-1 text-secondary">
                      {log.note || ""}
                    </div>
                  </td>
                </tr>
              ))}
              {!logs.length ? (
                <tr>
                  <td colSpan={7}>
                    <div className="sarjan-empty-state">
                      No stock movement yet.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {logs.length > logPageSize ? (
          <div className="sarjan-products-pagination sarjan-inventory-pagination">
            <div className="body-text text-secondary">
              Showing <span>{logStartIndex + 1}</span>-
              <span>{logEndIndex}</span> of <span>{logs.length}</span> logs
            </div>
            <div className="sarjan-products-pagination-actions">
              <div className="tf-select sarjan-products-page-size">
                <select
                  value={logPageSize}
                  onChange={(event) =>
                    setLogPageSize(Number(event.target.value))
                  }
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
              <button
                type="button"
                className="sarjan-products-page-btn"
                disabled={currentLogPage === 1}
                onClick={() => setLogPage((value) => Math.max(1, value - 1))}
              >
                <i className="icon icon-chevron-left" />
              </button>
              <div className="sarjan-products-page-list">
                {logPages.map((pageNumber, index) => {
                  const previous = logPages[index - 1];
                  return (
                    <span
                      className="sarjan-products-page-group"
                      key={pageNumber}
                    >
                      {previous && pageNumber - previous > 1 ? (
                        <span className="sarjan-products-page-ellipsis">
                          ...
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className={`sarjan-products-page-btn ${pageNumber === currentLogPage ? "active" : ""}`}
                        onClick={() => setLogPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                className="sarjan-products-page-btn"
                disabled={currentLogPage === totalLogPages}
                onClick={() =>
                  setLogPage((value) => Math.min(totalLogPages, value + 1))
                }
              >
                <i className="icon icon-chevron-right" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
