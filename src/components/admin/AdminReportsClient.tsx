"use client";

import { useMemo, useState } from "react";
import { AdminReportsCharts } from "@/components/admin/AdminReportsCharts";
import type { AdminReportsData } from "@/lib/admin-reports";
import type { ReportKey } from "@/lib/admin-report-charts";
import {
  REPORT_IMAGE_KEY,
  absoluteReportImageUrl,
  normalizeAdminImageSrc,
  downloadXlsxPlain,
  downloadXlsxWithImages,
  printPdfWithImages,
  rowsIncludeProductImages,
} from "@/lib/admin-report-export";

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
        .map((header) => {
          const value =
            header === REPORT_IMAGE_KEY
              ? absoluteReportImageUrl(String(row[header] ?? ""))
              : String(row[header] ?? "");
          return `"${value.replaceAll('"', '""')}"`;
        })
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
  if (rowsIncludeProductImages(rows)) {
    await downloadXlsxWithImages(filename, rows);
    return;
  }
  await downloadXlsxPlain(filename, rows);
}

function printPdf(title: string, rows: Array<Record<string, unknown>>) {
  printPdfWithImages(title, rows);
}

function orderedHeaders(rows: Array<Record<string, unknown>>) {
  const keys = Object.keys(rows[0] ?? {});
  if (!keys.includes(REPORT_IMAGE_KEY)) return keys;
  return [REPORT_IMAGE_KEY, ...keys.filter((key) => key !== REPORT_IMAGE_KEY)];
}

export function AdminReportsClient({ data }: { data: AdminReportsData }) {
  const [active, setActive] = useState<ReportKey>("orders");
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
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
  const headers = orderedHeaders(rows);
  const hasImageColumn = headers.includes(REPORT_IMAGE_KEY);

  const runExport = async (kind: "csv" | "xlsx" | "pdf") => {
    setExporting(true);
    try {
      if (kind === "csv") downloadCsv(`${active}-report.csv`, rows);
      if (kind === "xlsx") await downloadXlsx(`${active}-report.xlsx`, rows);
      if (kind === "pdf") printPdf(reportLabels[active], rows);
    } finally {
      setExporting(false);
    }
  };

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
              Charts above match the selected report tab. Export tables as CSV,
              Excel, or PDF. Inventory and movement exports include product
              photos.
            </div>
          </div>
          <div className="d-flex gap10 flex-wrap">
            <button
              type="button"
              className="tf-button"
              disabled={exporting || !rows.length}
              onClick={() => void runExport("csv")}
            >
              CSV
            </button>
            <button
              type="button"
              className="tf-button"
              disabled={exporting || !rows.length}
              onClick={() => void runExport("xlsx")}
            >
              {exporting ? "Exporting…" : "Excel"}
            </button>
            <button
              type="button"
              className="tf-button"
              disabled={exporting || !rows.length}
              onClick={() => void runExport("pdf")}
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
        <AdminReportsCharts report={active} data={data} />
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
        <div className="wg-table sarjan-report-table">
          <table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th className="text-title" key={header}>
                    {header === REPORT_IMAGE_KEY ? "Photo" : header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 500).map((row, index) => (
                <tr className="tf-table-item item-row" key={index}>
                  {headers.map((header) => {
                    if (header === REPORT_IMAGE_KEY) {
                      const src = normalizeAdminImageSrc(
                        String(row[header] ?? ""),
                      );
                      return (
                        <td key={header} className="sarjan-report-table__image">
                          {src ? (
                            <img src={src} alt="" width={48} height={48} />
                          ) : (
                            "-"
                          )}
                        </td>
                      );
                    }
                    const text = String(row[header] ?? "-");
                    return (
                      <td
                        key={header}
                        title={text.length > 48 ? text : undefined}
                      >
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={Math.max(headers.length, 1)}>
                    <div className="sarjan-empty-state">
                      No report data found.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {hasImageColumn ? (
          <p className="text-caption-1 text-secondary mt_12 mb_0">
            Product photos are embedded in Excel and PDF for this report.
          </p>
        ) : null}
      </div>
    </>
  );
}
