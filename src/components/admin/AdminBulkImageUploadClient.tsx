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

type LibraryImage = {
  fileName: string;
  url: string;
  absoluteUrl: string;
  size: number;
  updatedAt: string;
};

function toAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return new URL(path, window.location.origin).toString();
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString();
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
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copyNote, setCopyNote] = useState("");
  const previewUrlsRef = useRef<string[]>([]);

  const loadLibrary = useCallback(async (query: string) => {
    setLibraryLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      params.set("limit", "500");
      const res = await fetch(`/api/admin/uploads?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Could not load uploaded images");
      }
      const data = (await res.json()) as {
        images?: Array<{
          fileName: string;
          url: string;
          size: number;
          updatedAt: string;
        }>;
        total?: number;
      };
      setLibrary(
        (data.images ?? []).map((image) => ({
          ...image,
          absoluteUrl: toAbsoluteUrl(image.url),
        })),
      );
      setLibraryTotal(data.total ?? data.images?.length ?? 0);
    } catch (error) {
      setCopyNote(
        error instanceof Error
          ? error.message
          : "Could not load uploaded images",
      );
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary("");
  }, [loadLibrary]);

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
      await loadLibrary(libraryQuery);
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

  const copyLines = async (lines: string[], message: string) => {
    if (!lines.length) {
      setCopyNote("Koi image URL nahi mili.");
      return;
    }
    await copyText(lines.join("\n"));
    setCopyNote(message);
  };

  const copyAllUrls = async (absolute: boolean) => {
    const lines = completedRows.map((row) =>
      absolute ? row.absoluteUrl! : row.relativeUrl!,
    );
    await copyLines(
      lines,
      `${lines.length} URL${lines.length > 1 ? "s" : ""} copied — sheet mein paste karein.`,
    );
  };

  const copyLibraryUrls = async () => {
    await copyLines(
      library.map((image) => image.absoluteUrl),
      `${library.length} library URL${library.length === 1 ? "" : "s"} copied.`,
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

  const copyLibraryCsv = async () => {
    if (!library.length) {
      setCopyNote("Library mein koi image nahi hai.");
      return;
    }
    const csv = library
      .map((image) => {
        const name = image.fileName.replace(/"/g, '""');
        const url = image.absoluteUrl.replace(/"/g, '""');
        return `"${name}","${url}"`;
      })
      .join("\n");
    await copyText(`"File name","Image URL"\n${csv}`);
    setCopyNote("Library CSV copied — sheet mein paste karein.");
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

      <div className="wg-box sarjan-report-box mb-30">
        <div className="sarjan-bulk-upload-actions">
          <div>
            <strong>Uploaded images library</strong>
            <div className="body-text text-secondary">
              {libraryLoading
                ? "Loading…"
                : `${libraryTotal} image${libraryTotal === 1 ? "" : "s"} on server`}
            </div>
          </div>
          <div className="sarjan-bulk-upload-actions__buttons">
            <input
              type="search"
              className="sarjan-bulk-upload-search"
              placeholder="Search file name…"
              value={libraryQuery}
              onChange={(event) => setLibraryQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void loadLibrary(event.currentTarget.value);
                }
              }}
            />
            <button
              type="button"
              className="tf-button style-2"
              disabled={libraryLoading}
              onClick={() => void loadLibrary(libraryQuery)}
            >
              Search
            </button>
            <button
              type="button"
              className="tf-button style-2"
              disabled={!library.length || libraryLoading}
              onClick={() => void copyLibraryUrls()}
            >
              Copy all URLs
            </button>
            <button
              type="button"
              className="tf-button style-2"
              disabled={!library.length || libraryLoading}
              onClick={() => void copyLibraryCsv()}
            >
              Copy CSV
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
                <th>Uploaded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {libraryLoading ? (
                <tr>
                  <td colSpan={6}>Loading uploaded images…</td>
                </tr>
              ) : library.length ? (
                library.map((image, index) => (
                  <tr key={image.url}>
                    <td>{index + 1}</td>
                    <td>
                      <img
                        src={image.url}
                        alt=""
                        className="sarjan-bulk-upload-thumb"
                        loading="lazy"
                      />
                    </td>
                    <td className="sarjan-bulk-upload-filename">
                      <div>{image.fileName}</div>
                      <div className="body-text text-secondary">
                        {formatBytes(image.size)}
                      </div>
                    </td>
                    <td>
                      <code className="sarjan-bulk-upload-url">
                        {image.absoluteUrl}
                      </code>
                    </td>
                    <td>{formatUploadedAt(image.updatedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="tf-button style-2"
                        onClick={() =>
                          void copyText(image.absoluteUrl).then(() =>
                            setCopyNote(`Copied: ${image.fileName}`),
                          )
                        }
                      >
                        Copy
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>Abhi koi uploaded image nahi mili.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="wg-box sarjan-report-box">
          <div className="sarjan-bulk-upload-actions">
            <div>
              <strong>This upload session</strong>
              <div className="body-text text-secondary">
                <strong>{completedRows.length}</strong> / {rows.length} uploaded
              </div>
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
