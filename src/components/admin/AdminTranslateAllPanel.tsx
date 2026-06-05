"use client";

import { useCallback, useEffect, useState } from "react";

type TranslateStatus = {
  pending: boolean;
  pendingLabels: string[];
  pendingSections?: string[];
};

type TranslateStepResponse = TranslateStatus & {
  ok?: boolean;
  done?: boolean;
  changed?: boolean;
  message?: string;
  error?: string;
  stepLabel?: string | null;
  translatedLabels?: string[];
};

function formatFetchError(res: Response, text: string): string {
  if (res.status === 504 || res.status === 502) {
    return "Server timed out on a translation step. Click “Translate all now” again — saved progress will continue where it left off.";
  }
  if (!text.trim()) {
    return `Server returned an empty response (${res.status}). Refresh the page and try again.`;
  }
  return `Invalid server response (${res.status}). Refresh the page and try again.`;
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(formatFetchError(res, text));
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(formatFetchError(res, text));
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
    const maxSteps = 400;
    let steps = 0;
    let lastLabels: string[] = [];

    try {
      while (steps < maxSteps) {
        steps += 1;
        const res = await fetch("/api/admin/cms/translate-all", {
          method: "POST",
          credentials: "include",
        });
        const data = await readJsonResponse<TranslateStepResponse>(res);
        if (!res.ok) throw new Error(data.error ?? "Translation failed");

        setStatus(data);
        if (data.stepLabel) {
          lastLabels = [data.stepLabel];
        }

        if (data.done || !data.pending) {
          setMessage(
            data.message ??
              "Hindi and Gujarati translations generated and saved.",
          );
          break;
        }

        const pending = data.pendingLabels.join(", ") || "remaining sections";
        setMessage(
          `Step ${steps}: saved ${data.stepLabel ?? "content"}. Still pending: ${pending}. Continuing…`,
        );

        if (!data.changed) {
          throw new Error(
            "Translation stalled with pending content. Retry in a minute or add OPENAI_API_KEY for faster bulk translate.",
          );
        }
      }

      if (steps >= maxSteps) {
        setError(
          "Stopped after many steps. Click “Translate all now” again to continue.",
        );
      } else if (lastLabels.length) {
        void loadStatus();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Translation failed. Try again.",
      );
      void loadStatus();
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
                  Translates in small steps to avoid server timeouts. Keep this
                  tab open — progress is saved after each step.
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
