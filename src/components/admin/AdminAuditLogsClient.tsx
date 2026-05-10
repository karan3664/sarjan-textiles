"use client";

import type { AuditLog } from "@/lib/cms-store";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function downloadCsv(rows: AuditLog[]) {
  const headers = ["date", "actor", "role", "action", "entity", "entityId", "note"];
  const csv = [
    headers.join(","),
    ...rows.map((log) => [
      log.createdAt,
      log.actor,
      log.role ?? "",
      log.action,
      log.entity,
      log.entityId ?? "",
      log.note ?? "",
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "admin-audit-logs.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminAuditLogsClient({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="wg-box sarjan-report-box">
      <div className="flex flex-wrap justify-between gap14 items-center mb-20">
        <div>
          <h5>Audit Logs</h5>
          <div className="body-text text-secondary">Admin action history for orders, clients, products, inventory, and CMS changes.</div>
        </div>
        <div className="d-flex gap10 flex-wrap">
          <button type="button" className="tf-button" onClick={() => downloadCsv(logs)}>Export CSV</button>
          <div className="box-status text-button type-delivery">{logs.length} Logs</div>
        </div>
      </div>
      <div className="wg-table table-product-list">
        <table>
          <thead><tr><th className="text-title">Date</th><th className="text-title">Actor</th><th className="text-title">Role</th><th className="text-title">Action</th><th className="text-title">Entity</th><th className="text-title">Note</th></tr></thead>
          <tbody>
            {logs.slice(0, 200).map((log) => (
              <tr className="tf-table-item item-row" key={log.id}>
                <td>{formatDate(log.createdAt)}</td>
                <td>{log.actor}</td>
                <td><span className="box-status text-button type-delivery">{log.role ?? "admin"}</span></td>
                <td>{log.action}</td>
                <td>{log.entity}{log.entityId ? ` / ${log.entityId}` : ""}</td>
                <td>{log.note || "-"}</td>
              </tr>
            ))}
            {!logs.length ? <tr><td colSpan={6}><div className="sarjan-empty-state">No audit logs yet.</div></td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
