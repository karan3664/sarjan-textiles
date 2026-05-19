"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type StudioStatus = "queued" | "processing" | "processed" | "approved" | "rejected" | "failed";
type StudioShootStyle = "current-style";

type StudioRecord = {
  id: string;
  originalName: string;
  rawPath: string;
  rawUrl: string;
  outputs?: {
    webReady: string;
    thumbnail: string;
    zoom: string;
    compressed: string;
  };
  finalPath?: string;
  finalUrl?: string;
  finalPublicUrl?: string;
  prompt: string;
  shootStyle: StudioShootStyle;
  metadata: {
    category: string;
    collection: string;
    attributeType: string;
    attributeValue: string;
    color?: string;
    pattern: string;
    seoTags: string[];
    cmsMapping: {
      categorySlug: string;
      collectionSlug: string;
      attributeSlug: string;
    };
  };
  status: StudioStatus;
  qaNote?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type StudioSnapshot = {
  root: string;
  promptTemplate: string;
  records: StudioRecord[];
  summary: {
    total: number;
    queued: number;
    processed: number;
    approved: number;
    rejected: number;
    failed: number;
    pendingQa: number;
  };
};

type UploadForm = {
  category: string;
  collection: string;
  attributeType: string;
  attributeValue: string;
  shootStyle: StudioShootStyle;
};

const initialForm: UploadForm = {
  category: "shirts",
  collection: "ajrakh mashru",
  attributeType: "color",
  attributeValue: "red",
  shootStyle: "current-style",
};

const statuses: Array<StudioStatus | "all"> = ["all", "queued", "processed", "approved", "rejected", "failed"];
const pageSizes = [10, 25, 50];

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    throw new Error(response.ok ? "API returned empty response" : `Request failed with ${response.status}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "API returned invalid JSON" : text.slice(0, 160) || `Request failed with ${response.status}`);
  }
}

function outputUrl(path?: string) {
  return path ? `/api/admin/ai-studio/file?path=${encodeURIComponent(path)}` : "";
}

function statusClass(status: StudioStatus) {
  if (status === "approved" || status === "processed") return "type-completed";
  if (status === "failed" || status === "rejected") return "type-pending";
  return "type-delivery";
}

function readablePath(path: string) {
  return path.replaceAll("/", " / ");
}

function PaginationControls({
  currentPage,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const start = total ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="sarjan-ai-pagination">
      <div className="body-text text-secondary">
        Showing {start}-{end} of {total}
      </div>
      <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
        {pageSizes.map((size) => (
          <option key={size} value={size}>
            {size} per page
          </option>
        ))}
      </select>
      <div className="sarjan-ai-page-buttons">
        <button type="button" className="tf-button style-1" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
          Prev
        </button>
        <span className="text-title">
          {currentPage} / {totalPages}
        </span>
        <button type="button" className="tf-button style-1" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}

export function AdminAiProductStudioClient() {
  const [snapshot, setSnapshot] = useState<StudioSnapshot | null>(null);
  const [form, setForm] = useState<UploadForm>(initialForm);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StudioStatus | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");
  const [skuById, setSkuById] = useState<Record<string, string>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    const response = await fetch("/api/admin/ai-studio", { cache: "no-store" });
    const data = await readApiJson<StudioSnapshot | { error?: string }>(response);
    if (!response.ok) throw new Error("error" in data && data.error ? data.error : "AI studio API failed");
    const snapshotData = data as StudioSnapshot;
    setSnapshot(snapshotData);
    setPromptDraft(snapshotData.promptTemplate);
  };

  useEffect(() => {
    refresh().catch(() => setMessage("AI studio snapshot failed."));
  }, []);

  const categories = useMemo(() => {
    const names = snapshot?.records.map((record) => record.metadata.category) ?? [];
    return ["all", ...Array.from(new Set(names)).sort()];
  }, [snapshot]);

  const filteredRecords = useMemo(() => {
    return (snapshot?.records ?? []).filter((record) => {
      const statusMatch = selectedStatus === "all" || record.status === selectedStatus;
      const categoryMatch = selectedCategory === "all" || record.metadata.category === selectedCategory;
      return statusMatch && categoryMatch;
    });
  }, [selectedCategory, selectedStatus, snapshot]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedRecords = filteredRecords.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedStatus, pageSize]);

  const handleFiles = (nextFiles: FileList | File[]) => {
    const imageFiles = Array.from(nextFiles).filter((file) => /image\/|\.jpe?g$|\.png$|\.webp$/i.test(file.type || file.name));
    setFiles(imageFiles);
    setMessage(imageFiles.length ? `${imageFiles.length} image(s) ready.` : "No supported images selected.");
  };

  const upload = async () => {
    if (!files.length) {
      setMessage("Select images first.");
      return;
    }

    setBusy(true);
    setMessage("Uploading raw photos...");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));

    try {
      const response = await fetch("/api/admin/ai-studio/upload", { method: "POST", body: formData });
      const data = await readApiJson<{ added: StudioRecord[]; skipped?: string[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
      setMessage(`${data.added.length} raw image(s) queued. ${data.skipped?.length ?? 0} duplicate image(s) skipped.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const runProcess = async (ids?: string[]) => {
    if (processing) {
      setMessage("AI processing already running. Wait for current image batch to finish.");
      return;
    }

    setProcessing(true);
    setMessage(ids?.length ? "Processing selected image. Mannequin AI cleanup can take 60-120 seconds..." : "Running batch processor. AI cleanup can take time...");

    try {
      const response = await fetch("/api/admin/ai-studio/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, limit: 3 }),
      });
      const data = await readApiJson<{ processed: StudioRecord[]; remaining?: number; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Processing failed");
      setMessage(`${data.processed.length} image(s) processed. ${data.remaining ?? 0} remaining in queue.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Processing failed.");
    } finally {
      setProcessing(false);
    }
  };

  const scanRaw = async () => {
    setBusy(true);
    setMessage("Scanning products/raw folder...");

    try {
      const response = await fetch("/api/admin/ai-studio/scan", { method: "POST" });
      const data = await readApiJson<{ added: StudioRecord[]; skipped?: string[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Scan failed");
      setMessage(`${data.added.length} raw folder image(s) detected. ${data.skipped?.length ?? 0} existing image(s) skipped.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  };

  const savePrompt = async () => {
    setBusy(true);
    setMessage("Saving AI prompt...");

    try {
      const response = await fetch("/api/admin/ai-studio/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptTemplate: promptDraft }),
      });
      const data = await readApiJson<{ promptTemplate: string; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Prompt save failed");
      setPromptDraft(data.promptTemplate);
      setMessage("Prompt saved. New queued images inherit this prompt.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prompt save failed.");
    } finally {
      setBusy(false);
    }
  };

  const recordAction = async (record: StudioRecord, action: "approve" | "reject" | "reprocess" | "delete" | "catalog_shoot") => {
    if (action === "delete" && !window.confirm(`Delete ${record.originalName}? Raw, processed, and final files will be removed.`)) return;

    setBusy(true);
    setMessage(
      action === "catalog_shoot"
          ? `Queued CATALOG style for ${record.originalName}. Now click Reprocess.`
          : `${action} ${record.originalName}...`,
    );

    try {
      const response = await fetch("/api/admin/ai-studio/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          action,
          sku: skuById[record.id],
          note: noteById[record.id],
        }),
      });
      const data = await readApiJson<{ record: StudioRecord; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Action failed");
      setMessage(
        action === "approve"
          ? `Final image ready for CMS: ${data.record.finalPublicUrl || data.record.finalPath}`
          : action === "delete"
            ? `${record.originalName} deleted.`
            : action === "catalog_shoot"
                ? `${record.originalName} converted to CATALOG style. Click Reprocess.`
                : `${record.originalName} updated.`,
      );
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const replaceRaw = async (record: StudioRecord, file?: File) => {
    if (!file) return;

    setBusy(true);
    setMessage(`Replacing ${record.originalName}...`);

    const formData = new FormData();
    formData.append("id", record.id);
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/ai-studio/replace", { method: "POST", body: formData });
      const data = await readApiJson<{ record: StudioRecord; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Replace failed");
      setMessage(`${data.record.originalName} queued. Run process again.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Replace failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot) {
    return (
      <div className="wg-box mt-24">
        <div className="body-text">Loading AI Product Studio...</div>
      </div>
    );
  }

  const summaryCards = [
    { label: "Total Images", value: snapshot.summary.total, icon: "icon-package" },
    { label: "Queued", value: snapshot.summary.queued, icon: "icon-clock" },
    { label: "Pending QA", value: snapshot.summary.pendingQa, icon: "icon-clipboard-text" },
    { label: "Approved Final", value: snapshot.summary.approved, icon: "icon-check" },
    { label: "Failed", value: snapshot.summary.failed, icon: "icon-alert-circle" },
  ];

  return (
    <div className="sarjan-ai-studio">
      <div className="sarjan-ai-studio-kpis">
        {summaryCards.map((card) => (
          <div className="wg-card" key={card.label}>
            <div className="content">
              <div className="title text-secondary">{card.label}</div>
              <div className="number">
                <h4>{card.value}</h4>
                <div className="time text-caption-1 text-secondary">AI studio queue</div>
              </div>
            </div>
            <div className="icon">
              <i className={card.icon} />
            </div>
          </div>
        ))}
      </div>

      <div className="sarjan-ai-studio-layout">
        <div className="wg-box">
          <div className="box-top">
            <h5 className="box-title">RAW Upload System</h5>
            <button className="tf-button style-1" type="button" onClick={scanRaw} disabled={busy}>
              Scan Raw Folder
            </button>
          </div>

          <div className="sarjan-ai-form-grid">
            {([
              ["category", "Category"],
              ["collection", "Design / Fabric / Collection"],
              ["attributeType", "Attribute Type"],
              ["attributeValue", "Attribute Value"],
            ] as Array<[keyof UploadForm, string]>).map(([key, label]) => (
              <fieldset className="name" key={key}>
                <div className="body-title mb-10">{label}</div>
                <input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
              </fieldset>
            ))}
            <fieldset className="name">
              <div className="body-title mb-10">Shoot Style</div>
              <select value={form.shootStyle} onChange={(event) => setForm((current) => ({ ...current, shootStyle: event.target.value as StudioShootStyle }))}>
                <option value="current-style">Current catalog style</option>
              </select>
              <div className="text-caption-1 text-secondary mt-8">Flat-lay catalog cleanup only.</div>
            </fieldset>
          </div>

          <div
            className="sarjan-ai-dropzone"
            onDrop={(event) => {
              event.preventDefault();
              handleFiles(event.dataTransfer.files);
            }}
            onDragOver={(event) => event.preventDefault()}
          >
            <div className="sarjan-upload-icon">
              <i className="icon-upload" />
            </div>
            <div>
              <div className="text-title">Drop JPG, PNG, WEBP files</div>
              <div className="text-caption-1 text-secondary">Target: products/raw/{form.category}/{form.collection}/{form.attributeType}/{form.attributeValue}</div>
            </div>
            <div className="sarjan-ai-upload-actions">
              <button className="tf-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                Select Images
              </button>
              <button className="tf-button style-1" type="button" onClick={() => folderInputRef.current?.click()} disabled={busy}>
                Select Folder
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => event.target.files && handleFiles(event.target.files)} />
            <input
              ref={folderInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(event) => event.target.files && handleFiles(event.target.files)}
            />
          </div>

          <div className="sarjan-ai-action-row">
            <div className="body-text text-secondary">{files.length ? `${files.length} selected image(s)` : "No pending local selection"}</div>
            <button className="tf-button" type="button" onClick={upload} disabled={busy || !files.length}>
              Queue Upload
            </button>
            <button className="tf-button style-1" type="button" onClick={() => runProcess()} disabled={busy || processing}>
              {processing ? "Processing..." : "Run Batch Process"}
            </button>
          </div>

          {message && <div className="sarjan-admin-message mt-20">{message}</div>}
        </div>

        <div className="wg-box">
          <div className="box-top">
            <h5 className="box-title">AI Processing Rules</h5>
            <button className="tf-button style-1" type="button" onClick={savePrompt} disabled={busy}>
              Save Prompt
            </button>
          </div>
          <div className="sarjan-ai-rules">
            {["Maintain original fabric", "Maintain exact color and texture", "Preserve stitching, buttons, collar, shape", "Generate white or #f5f5f5 catalog outputs", "Create web-ready, thumbnail, zoom, compressed variants"].map((rule) => (
              <div key={rule}>
                <i className="icon-check" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
          <textarea className="sarjan-ai-prompt" value={promptDraft} onChange={(event) => setPromptDraft(event.target.value)} />
        </div>
      </div>

      <div className="wg-box">
        <div className="box-top">
          <h5 className="box-title">CMS Upload Use</h5>
        </div>
        <div className="sarjan-ai-cms-grid">
          <div>
            <div className="text-title">Where images store</div>
            <div className="body-text text-secondary">RAW/processed state stays in products/. Approved final images also publish to public/uploads/ai-products/ for product listing use.</div>
          </div>
          <div>
            <div className="text-title">Bulk sheet</div>
            <div className="body-text text-secondary">Use approved public URL in image_urls column. Multiple photos: comma-separated URLs.</div>
          </div>
          <div>
            <div className="text-title">Single product</div>
            <div className="body-text text-secondary">Open Products Create, paste approved public URL into Product Images field, or upload manually.</div>
          </div>
        </div>
      </div>

      <div className="wg-box">
        <div className="box-top sarjan-ai-filter-top">
          <h5 className="box-title">Manual QA Queue</h5>
          <div className="sarjan-ai-filters">
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All categories" : category}
                </option>
              ))}
            </select>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as StudioStatus | "all")}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All statuses" : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <PaginationControls
          currentPage={currentPage}
          pageSize={pageSize}
          total={filteredRecords.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />

        <div className="sarjan-ai-queue">
          {paginatedRecords.map((record) => (
            <article className="sarjan-ai-card" key={record.id}>
              <div className="sarjan-ai-compare">
                <figure>
                  <img src={record.rawUrl} alt={`${record.originalName} raw`} />
                  <figcaption>RAW</figcaption>
                </figure>
                <figure>
                  {record.outputs?.webReady ? <img src={outputUrl(record.outputs.webReady)} alt={`${record.originalName} processed`} /> : <div className="sarjan-ai-placeholder">Process needed</div>}
                  <figcaption>Processed</figcaption>
                </figure>
              </div>

              <div className="sarjan-ai-card-body">
                <div className="sarjan-ai-card-head">
                  <div>
                    <h6>{record.originalName}</h6>
                    <div className="text-caption-1 text-secondary">{readablePath(record.rawPath)}</div>
                  </div>
                  <div className={`box-status text-button ${statusClass(record.status)}`}>{record.status}</div>
                </div>

                <div className="sarjan-ai-meta-grid">
                  <span>Category: {record.metadata.category}</span>
                  <span>Collection: {record.metadata.collection}</span>
                  <span>{record.metadata.attributeType}: {record.metadata.attributeValue}</span>
                  <span>Pattern: {record.metadata.pattern}</span>
                  <span>Shoot: current catalog</span>
                </div>

                <div className="sarjan-ai-tags">
                  {record.metadata.seoTags.slice(0, 7).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                {record.outputs && (
                  <div className="sarjan-ai-output-links">
                    <a href={outputUrl(record.outputs.webReady)} target="_blank" rel="noreferrer">Web</a>
                    <a href={outputUrl(record.outputs.thumbnail)} target="_blank" rel="noreferrer">Thumb</a>
                    <a href={outputUrl(record.outputs.zoom)} target="_blank" rel="noreferrer">Zoom</a>
                    <a href={outputUrl(record.outputs.compressed)} target="_blank" rel="noreferrer">Compressed</a>
                    {record.finalUrl && <a href={record.finalUrl} target="_blank" rel="noreferrer">Final</a>}
                    {record.finalPublicUrl && <a href={record.finalPublicUrl} target="_blank" rel="noreferrer">CMS URL</a>}
                  </div>
                )}

                {record.finalPublicUrl && (
                  <input className="sarjan-ai-public-url" value={record.finalPublicUrl} readOnly onFocus={(event) => event.currentTarget.select()} aria-label="Approved public CMS image URL" />
                )}

                {record.error && <div className="text-danger body-text">{record.error}</div>}
                {record.qaNote && <div className="sarjan-ai-note body-text">{record.qaNote}</div>}

                <div className="sarjan-ai-qa">
                  <input placeholder="SKU for final naming" value={skuById[record.id] ?? ""} onChange={(event) => setSkuById((current) => ({ ...current, [record.id]: event.target.value }))} />
                  <input placeholder="QA note" value={noteById[record.id] ?? ""} onChange={(event) => setNoteById((current) => ({ ...current, [record.id]: event.target.value }))} />
                  <button className="tf-button style-1" type="button" onClick={() => runProcess([record.id])} disabled={busy || processing}>
                    Reprocess
                  </button>
                  <button className="tf-button style-1" type="button" onClick={() => recordAction(record, "catalog_shoot")} disabled={busy}>
                    Set Catalog
                  </button>
                  <button className="tf-button style-1" type="button" onClick={() => recordAction(record, "reject")} disabled={busy}>
                    Reject
                  </button>
                  <button className="tf-button" type="button" onClick={() => recordAction(record, "approve")} disabled={busy || !record.outputs}>
                    Approve
                  </button>
                  <label className="tf-button style-1 sarjan-ai-replace">
                    Replace
                    <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => replaceRaw(record, event.target.files?.[0])} />
                  </label>
                  <button className="tf-button style-1" type="button" onClick={() => recordAction(record, "delete")} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!filteredRecords.length && <div className="sarjan-ai-empty body-text text-secondary">No images match current filters.</div>}
        {filteredRecords.length > pageSize && (
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            total={filteredRecords.length}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </div>
  );
}
