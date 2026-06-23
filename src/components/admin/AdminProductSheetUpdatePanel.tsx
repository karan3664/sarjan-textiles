"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/data/mock";

type PreviewRow = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  changes: string[];
};

type Props = {
  open: boolean;
  selectedProducts: Product[];
  onClose: () => void;
  onApplied: (products: Product[]) => void;
};

export function AdminProductSheetUpdatePanel({
  open,
  selectedProducts,
  onClose,
  onApplied,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [previews, setPreviews] = useState<PreviewRow[]>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<
    Array<{ row: number; label: string }>
  >([]);
  const [skippedRows, setSkippedRows] = useState<
    Array<{ row: number; label: string }>
  >([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPendingProducts([]);
    setPreviews([]);
    setUnmatchedRows([]);
    setSkippedRows([]);
  }, [open, selectedProducts]);

  const uploadSheet = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append(
        "slugs",
        JSON.stringify(selectedProducts.map((product) => product.slug)),
      );
      const res = await fetch("/api/admin/cms/products/bulk-update-preview", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as {
        products?: Product[];
        previews?: PreviewRow[];
        unmatchedRows?: Array<{ row: number; label: string }>;
        skippedRows?: Array<{ row: number; label: string }>;
        error?: string;
      };
      if (!res.ok || !data.products?.length) {
        throw new Error(data.error ?? "Could not read spreadsheet");
      }
      setPendingProducts(data.products);
      setPreviews(data.previews ?? []);
      setUnmatchedRows(data.unmatchedRows ?? []);
      setSkippedRows(data.skippedRows ?? []);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setPendingProducts([]);
      setPreviews([]);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const applyUpdates = async () => {
    if (!pendingProducts.length) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cms/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: pendingProducts }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      onApplied(pendingProducts);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="sarjan-bulk-edit-overlay" role="presentation">
      <button
        type="button"
        className="sarjan-bulk-edit-backdrop"
        aria-label="Close sheet import"
        onClick={onClose}
      />
      <aside
        className="sarjan-bulk-edit-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sarjan-sheet-update-title"
      >
        <div className="sarjan-bulk-edit-header">
          <div>
            <div className="text-caption-1 text-secondary">Excel update</div>
            <h4 id="sarjan-sheet-update-title">
              Update {selectedProducts.length} product
              {selectedProducts.length === 1 ? "" : "s"} from sheet
            </h4>
          </div>
          <button
            type="button"
            className="sarjan-bulk-edit-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="icon-close" />
          </button>
        </div>

        <div className="sarjan-bulk-edit-selected">
          <div className="sarjan-bulk-edit-selected__head">
            <span className="text-caption-1 text-secondary">
              Selected for sheet update
            </span>
            <span className="sarjan-bulk-edit-selected__count">
              {selectedProducts.length}
            </span>
          </div>
          <ul className="sarjan-bulk-edit-selected-list">
            {selectedProducts.map((product) => (
              <li className="sarjan-bulk-edit-selected-item" key={product.slug}>
                <span className="sarjan-bulk-edit-selected-item__id">
                  {product.id}
                </span>
                <span className="sarjan-bulk-edit-selected-item__name">
                  {product.name}
                </span>
                <span className="sarjan-bulk-edit-selected-item__sku">
                  {product.sku}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sarjan-bulk-edit-body">
          <section className="sarjan-bulk-edit-section">
            <h5>How it works</h5>
            <p className="body-text text-secondary mb_12">
              Export selected products to Excel, edit in Google Sheets or Excel,
              then upload the same file here. Match rows using{" "}
              <strong>id</strong> or <strong>slug</strong> — do not change those
              columns. Empty cells keep the current value.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              hidden
              onChange={(event) => void uploadSheet(event.target.files)}
            />
            <button
              type="button"
              className="tf-button text-btn-uppercase"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Reading sheet…" : "Upload edited Excel / CSV"}
            </button>
          </section>

          {previews.length ? (
            <section className="sarjan-bulk-edit-section">
              <h5>Review changes ({previews.length})</h5>
              <ul className="sarjan-sheet-update-preview-list">
                {previews.map((item) => (
                  <li
                    key={item.slug}
                    className="sarjan-sheet-update-preview-item"
                  >
                    <div className="sarjan-sheet-update-preview-item__head">
                      <strong>{item.id}</strong>
                      <span>{item.name}</span>
                    </div>
                    <ul>
                      {item.changes.map((line) => (
                        <li key={`${item.slug}-${line}`}>{line}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {unmatchedRows.length ? (
            <section className="sarjan-bulk-edit-section">
              <h5>Unmatched rows ({unmatchedRows.length})</h5>
              <p className="body-text text-secondary">
                These sheet rows were skipped — id/slug not found in catalog.
              </p>
              <ul className="sarjan-sheet-update-skipped-list">
                {unmatchedRows.map((row) => (
                  <li key={`${row.row}-${row.label}`}>
                    Row {row.row}: {row.label}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {skippedRows.length ? (
            <section className="sarjan-bulk-edit-section">
              <h5>Outside selection ({skippedRows.length})</h5>
              <p className="body-text text-secondary">
                Rows matched a product but were not in your current selection.
              </p>
              <ul className="sarjan-sheet-update-skipped-list">
                {skippedRows.map((row) => (
                  <li key={`skip-${row.row}-${row.label}`}>
                    Row {row.row}: {row.label}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="sarjan-bulk-edit-footer">
          {error ? <div className="text-tiny text-danger">{error}</div> : null}
          <div className="sarjan-bulk-edit-footer__actions">
            <button
              type="button"
              className="tf-button style-2 text-btn-uppercase"
              onClick={onClose}
              disabled={saving || uploading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="tf-button text-btn-uppercase"
              disabled={!pendingProducts.length || saving || uploading}
              onClick={() => void applyUpdates()}
            >
              {saving
                ? "Updating..."
                : `Apply ${pendingProducts.length || ""} update${pendingProducts.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
