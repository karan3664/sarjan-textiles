"use client";

import { useMemo, useState } from "react";
import type { AdminReportsData } from "@/lib/admin-reports";

type ReportKey =
  | "orders"
  | "clients"
  | "inventory"
  | "finance"
  | "dispatch"
  | "productMovement";

const reportLabels: Record<ReportKey, string> = {
  orders: "Orders Report",
  clients: "Client Report",
  inventory: "Inventory Report",
  finance: "Finance / Credit Report",
  dispatch: "Dispatch Report",
  productMovement: "Product Movement Report",
};

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = Object.keys(rows[0] ?? { empty: "" });
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`)
        .join(","),
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
  rows: Array<Record<string, unknown>>,
) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows),
    "Report",
  );
  XLSX.writeFile(workbook, filename);
}

function printPdf(title: string, rows: Array<Record<string, unknown>>) {
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

export function AdminReportsClient({ data }: { data: AdminReportsData }) {
  const [active, setActive] = useState<ReportKey>("orders");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const reportRows = data[active] as Array<Record<string, unknown>>;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return reportRows;
    return reportRows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(normalized),
      ),
    );
  }, [active, data, query]);
  const headers = Object.keys(rows[0] ?? {});

  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-products-kpi-grid">
        {data.summary.map((metric) => (
          <div className="sarjan-home-kpi-card" key={metric.label}>
            <div className="sarjan-home-kpi-icon">
              <i className="icon-chart-bar" />
            </div>
            <div>
              <div className="body-text text-secondary">{metric.label}</div>
              <h5>{metric.value}</h5>
            </div>
          </div>
        ))}
      </div>
      <div className="wg-box sarjan-report-box">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Reports & Analytics</h5>
            <div className="body-text text-secondary">
              Orders, clients, inventory, dispatch, product movement, finance
              ledger, CSV, Excel, and PDF exports.
            </div>
          </div>
          <div className="d-flex gap10 flex-wrap">
            <button
              type="button"
              className="tf-button"
              onClick={() => downloadCsv(`${active}-report.csv`, rows)}
            >
              CSV
            </button>
            <button
              type="button"
              className="tf-button"
              onClick={() => downloadXlsx(`${active}-report.xlsx`, rows)}
            >
              Excel
            </button>
            <button
              type="button"
              className="tf-button"
              onClick={() => printPdf(reportLabels[active], rows)}
            >
              PDF
            </button>
          </div>
        </div>
        <div className="sarjan-report-tabs">
          {(Object.keys(reportLabels) as ReportKey[]).map((key) => (
            <button
              type="button"
              className={active === key ? "active" : ""}
              key={key}
              onClick={() => setActive(key)}
            >
              {reportLabels[key]}
            </button>
          ))}
        </div>
        <form
          className="form-search-2 sarjan-report-search"
          onSubmit={(event) => event.preventDefault()}
        >
          <fieldset className="name">
            <input
              className="show-search"
              placeholder="Search report"
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
        <div className="wg-table table-product-list sarjan-report-table">
          <table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th className="text-title" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 500).map((row, index) => (
                <tr className="tf-table-item item-row" key={index}>
                  {headers.map((header) => (
                    <td key={header}>{String(row[header] ?? "-")}</td>
                  ))}
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td>
                    <div className="sarjan-empty-state">
                      No report data found.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
