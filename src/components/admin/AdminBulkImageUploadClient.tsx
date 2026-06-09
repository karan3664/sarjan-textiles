"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UploadStatus = "queued" | "uploading" | "done" | "error";

type UploadRow = {
  id: string;
  fileName: string;
  status: UploadStatus;
  relativeUrl?: string;
  absoluteUrl?: string;
  error?: string;
  previewUrl?: string;
};

function toAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return new URL(path, window.location.origin).toString();
}

async function uploadOne(file: File) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/uploads", { method: "POST", body });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.url;
}

async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        await worker(items[index], index);
      }
    },
  );
  await Promise.all(runners);
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function AdminBulkImageUploadClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copyNote, setCopyNote] = useState("");
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const previews = previewUrlsRef.current;
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const completedRows = useMemo(
    () => rows.filter((row) => row.status === "done" && row.absoluteUrl),
    [rows],
  );

  const startUpload = async (files: File[]) => {
    const images = files.filter(
      (file) =>
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name),
    );
    if (!images.length) {
      setCopyNote("Sirf image files choose karein (JPG, PNG, WebP, …).");
      return;
    }

    const batch: Array<{ id: string; file: File; row: UploadRow }> = images.map(
      (file) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.push(previewUrl);
        const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
        return {
          id,
          file,
          row: {
            id,
            fileName: file.name,
            status: "queued" as const,
            previewUrl,
          },
        };
      },
    );

    setRows((current) => [...current, ...batch.map((item) => item.row)]);
    setCopyNote("");
    setUploading(true);

    const patchRow = (id: string, patch: Partial<UploadRow>) => {
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
    };

    try {
      await runPool(batch, 4, async (item) => {
        patchRow(item.id, { status: "uploading" });
        try {
          const relativeUrl = await uploadOne(item.file);
          patchRow(item.id, {
            status: "done",
            relativeUrl,
            absoluteUrl: toAbsoluteUrl(relativeUrl),
          });
        } catch (error) {
          patchRow(item.id, {
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          });
        }
      });
    } finally {
      setUploading(false);
    }
  };

  const onPickFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }
    await startUpload(Array.from(fileList));
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const copyAllUrls = async (absolute: boolean) => {
    const lines = completedRows.map((row) =>
      absolute ? row.absoluteUrl! : row.relativeUrl!,
    );
    if (!lines.length) {
      setCopyNote("Pehle kuch images upload karein.");
      return;
    }
    await copyText(lines.join("\n"));
    setCopyNote(
      `${lines.length} URL${lines.length > 1 ? "s" : ""} copied — sheet mein paste karein.`,
    );
  };

  const copyCsv = async () => {
    if (!completedRows.length) {
      setCopyNote("Pehle kuch images upload karein.");
      return;
    }
    const csv = completedRows
      .map((row) => {
        const name = row.fileName.replace(/"/g, '""');
        const url = (row.absoluteUrl ?? "").replace(/"/g, '""');
        return `"${name}","${url}"`;
      })
      .join("\n");
    await copyText(`"File name","Image URL"\n${csv}`);
    setCopyNote("CSV copied — Excel / Google Sheet mein paste karein.");
  };

  const clearDone = () => {
    setRows((current) => {
      current
        .filter((row) => row.status === "done")
        .forEach((row) => {
          if (row.previewUrl) {
            URL.revokeObjectURL(row.previewUrl);
            previewUrlsRef.current = previewUrlsRef.current.filter(
              (url) => url !== row.previewUrl,
            );
          }
        });
      return current.filter((row) => row.status !== "done");
    });
  };

  return (
    <div className="sarjan-bulk-image-upload">
      <div className="wg-box mb-30">
        <div className="body-title mb-10">
          <h5>Bulk image upload</h5>
        </div>
        <p className="body-text mb-20">
          Ek saath kai images upload karein. Neeche full URL milegi — copy karke
          product sheet ya Excel mein paste karein.
        </p>

        <div
          className={`sarjan-bulk-upload-dropzone${dragOver ? " is-dragover" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void onPickFiles(event.dataTransfer.files);
          }}
        >
          <i className="icon-image" aria-hidden />
          <p className="sarjan-bulk-upload-dropzone__title">
            Images yahan drag & drop karein
          </p>
          <p className="sarjan-bulk-upload-dropzone__hint">
            JPG, PNG, WebP, GIF — har file max 30MB
          </p>
          <button
            type="button"
            className="tf-button style-1"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Choose images"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => void onPickFiles(event.target.files)}
          />
        </div>

        {copyNote ? (
          <div className="sarjan-admin-message mt-20">{copyNote}</div>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="wg-box sarjan-report-box">
          <div className="sarjan-bulk-upload-actions">
            <div>
              <strong>{completedRows.length}</strong> / {rows.length} uploaded
            </div>
            <div className="sarjan-bulk-upload-actions__buttons">
              <button
                type="button"
                className="tf-button style-2"
                disabled={!completedRows.length}
                onClick={() => void copyAllUrls(true)}
              >
                Copy all URLs
              </button>
              <button
                type="button"
                className="tf-button style-2"
                disabled={!completedRows.length}
                onClick={() => void copyAllUrls(false)}
              >
                Copy relative paths
              </button>
              <button
                type="button"
                className="tf-button style-2"
                disabled={!completedRows.length}
                onClick={() => void copyCsv()}
              >
                Copy CSV for sheet
              </button>
              <button
                type="button"
                className="tf-button style-3"
                disabled={!completedRows.length || uploading}
                onClick={clearDone}
              >
                Clear done
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Preview</th>
                  <th>File</th>
                  <th>Image URL (sheet ke liye)</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>
                      {row.previewUrl ? (
                        <img
                          src={row.previewUrl}
                          alt=""
                          className="sarjan-bulk-upload-thumb"
                        />
                      ) : row.relativeUrl ? (
                        <img
                          src={row.relativeUrl}
                          alt=""
                          className="sarjan-bulk-upload-thumb"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="sarjan-bulk-upload-filename">
                      {row.fileName}
                    </td>
                    <td>
                      {row.absoluteUrl ? (
                        <code className="sarjan-bulk-upload-url">
                          {row.absoluteUrl}
                        </code>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {row.status === "queued" ? "Queued" : null}
                      {row.status === "uploading" ? "Uploading…" : null}
                      {row.status === "done" ? (
                        <span className="text-success">Done</span>
                      ) : null}
                      {row.status === "error" ? (
                        <span className="text-danger">{row.error}</span>
                      ) : null}
                    </td>
                    <td>
                      {row.absoluteUrl ? (
                        <button
                          type="button"
                          className="tf-button style-2"
                          onClick={() =>
                            void copyText(row.absoluteUrl!).then(() =>
                              setCopyNote(`Copied: ${row.fileName}`),
                            )
                          }
                        >
                          Copy
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
