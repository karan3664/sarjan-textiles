"use client";

import { useRef, useState } from "react";
import type { BackupSummary } from "@/lib/admin-backups";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AdminBackupsClient({
  initialBackups,
}: {
  initialBackups: BackupSummary[];
}) {
  const [backups, setBackups] = useState(initialBackups);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = (data: { backups?: BackupSummary[] }) => {
    if (Array.isArray(data.backups)) setBackups(data.backups);
  };

  const createBackup = async () => {
    setBusy("create");
    setMessage("");
    const res = await fetch("/api/admin/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(data.error ?? "Backup failed");
      return;
    }
    refresh(data);
    setName("");
    setMessage("Backup created.");
  };

  const restoreBackup = async (id: string) => {
    if (
      !window.confirm(
        "Restore this backup? Current CMS, clients, orders, payments, inquiries will be overwritten/upserted.",
      )
    )
      return;
    setBusy(id);
    setMessage("");
    const res = await fetch("/api/admin/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore-id", id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(data.error ?? "Restore failed");
      return;
    }
    refresh(data);
    setMessage("Backup restored.");
  };

  const deleteBackup = async (id: string) => {
    if (!window.confirm("Delete backup?")) return;
    setBusy(id);
    const res = await fetch(`/api/admin/backups?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMessage(data.error ?? "Delete failed");
      return;
    }
    refresh(data);
    setMessage("Backup deleted.");
  };

  const restoreUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy("upload");
    setMessage("");
    try {
      const backup = JSON.parse(await file.text());
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore-upload", backup }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Restore failed");
      refresh(data);
      setMessage("Uploaded backup restored.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Invalid backup file",
      );
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-products-kpi-grid">
        {[
          ["Backup Mode", "Supabase Production", "icon-database"],
          ["Daily Backup", "02:00 IST", "icon-timer"],
          ["Manual Restore", "JSON / Saved Backup", "icon-refresh"],
          [
            "Retention View",
            `${backups.length} backups`,
            "icon-clipboard-text",
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

      <div className="wg-box sarjan-report-box">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Database Backup / Restore</h5>
            <div className="body-text text-secondary">
              Backs up CMS, products, clients, orders, dispatch, payments,
              inquiries, inventory, SEO, and audit data.
            </div>
          </div>
          <div className="d-flex gap10 flex-wrap">
            <input
              className="sarjan-backup-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Backup name optional"
            />
            <button
              type="button"
              className="tf-button"
              onClick={createBackup}
              disabled={Boolean(busy)}
            >
              {busy === "create" ? "Creating..." : "Create Backup"}
            </button>
            <label className="tf-button style-1">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={(event) => restoreUpload(event.target.files)}
              />
              {busy === "upload" ? "Restoring..." : "Restore JSON"}
            </label>
          </div>
        </div>
        {message ? (
          <div className="sarjan-admin-message mb-20">{message}</div>
        ) : null}
        <div className="wg-table table-product-list">
          <table>
            <thead>
              <tr>
                <th className="text-title">Backup</th>
                <th className="text-title">Type</th>
                <th className="text-title">Created</th>
                <th className="text-title">By</th>
                <th className="text-title">Size</th>
                <th className="text-title">Action</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr className="tf-table-item item-row" key={backup.id}>
                  <td>
                    <div className="text-title">{backup.name}</div>
                    <div className="text-caption-1 text-secondary">
                      {backup.id}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`box-status text-button ${backup.source === "daily" ? "type-delivery" : "type-pending"}`}
                    >
                      {backup.source}
                    </span>
                  </td>
                  <td>{formatDate(backup.createdAt)}</td>
                  <td>{backup.createdBy}</td>
                  <td>{formatSize(backup.sizeBytes)}</td>
                  <td>
                    <div className="list-icon-function">
                      <a
                        className="item eye"
                        href={`/api/admin/backups?id=${encodeURIComponent(backup.id)}`}
                      >
                        <i className="icon-download" />
                      </a>
                      <button
                        type="button"
                        className="item edit"
                        onClick={() => restoreBackup(backup.id)}
                        disabled={Boolean(busy)}
                      >
                        <i className="icon-refresh" />
                      </button>
                      <button
                        type="button"
                        className="item trash"
                        onClick={() => deleteBackup(backup.id)}
                        disabled={Boolean(busy)}
                      >
                        <i className="icon-trash-2" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!backups.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="sarjan-empty-state">
                      No backups yet. Create first manual backup.
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
