"use client";

import { useCallback, useEffect, useState } from "react";

type TranslateStatus = {
  pending: boolean;
  pendingLabels: string[];
  pendingSections?: string[];
};

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      `Server returned an empty response (${res.status}). Refresh the page and try again.`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Invalid server response (${res.status}). Refresh the page and try again.`,
    );
  }
}

export function AdminTranslateAllPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [status, setStatus] = useState<TranslateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cms/translate-all", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await readJsonResponse<TranslateStatus & { error?: string }>(
        res,
      );
      if (!res.ok) throw new Error(data.error ?? "Could not load status");
      setStatus(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load translation status",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runTranslateAll = async () => {
    setRunning(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/cms/translate-all", {
        method: "POST",
        credentials: "include",
      });
      const data = await readJsonResponse<
        TranslateStatus & {
          ok?: boolean;
          changed?: boolean;
          message?: string;
          error?: string;
          translatedLabels?: string[];
        }
      >(res);
      if (!res.ok) throw new Error(data.error ?? "Translation failed");
      setStatus(data);
      if (data.changed && data.translatedLabels?.length) {
        setMessage(
          `${data.message ?? "Done."} Updated: ${data.translatedLabels.join(", ")}.`,
        );
      } else {
        setMessage(data.message ?? "Translations are up to date.");
      }
      void loadStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Translation failed. Try again.",
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={`wg-box${compact ? "" : " mb-4"}`}>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <h5 className="mb-1">App & website translations</h5>
          <p className="text-caption-1 text-secondary mb-0">
            Generate Hindi and Gujarati from your English CMS content before
            customers open the app. Prevents slow first load for Hindi/Gujarati
            users.
          </p>
        </div>
        <button
          type="button"
          className="tf-button style-1"
          disabled={loading || running}
          onClick={() => void runTranslateAll()}
        >
          {running ? "Translating…" : "Translate all now"}
        </button>
      </div>

      <div className="mt-3">
        {loading ? (
          <p className="text-caption-1 text-secondary mb-0">
            Checking translation status…
          </p>
        ) : null}
        {error ? (
          <div>
            <p className="text-danger mb-1">{error}</p>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-caption-1"
              onClick={() => void loadStatus()}
            >
              Retry status check
            </button>
          </div>
        ) : null}
        {message ? (
          <p className="text-caption-1 text-success mb-0">{message}</p>
        ) : null}
        {!loading && status && !error ? (
          status.pending ? (
            <div>
              <p className="text-button mb-2">
                Pending Hindi/Gujarati for:{" "}
                {status.pendingLabels.join(", ") || "some sections"}
              </p>
              {running ? (
                <p className="text-caption-1 text-secondary mb-0">
                  Large catalogs can take several minutes with the free
                  translator. Keep this tab open…
                </p>
              ) : (
                <p className="text-caption-1 text-secondary mb-0">
                  Tip: set OPENAI_API_KEY in .env for faster, more reliable bulk
                  translation.
                </p>
              )}
            </div>
          ) : (
            <p className="text-caption-1 text-secondary mb-0">
              All sections translated. New English edits auto-translate on save.
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}
