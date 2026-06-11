"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "sarjan-chunk-reload-once";

function isStaleChunkError(message: string) {
  return (
    message.includes("reading 'call'") ||
    message.includes("Loading chunk") ||
    message.includes("ChunkLoadError") ||
    message.includes("Failed to load chunk") ||
    message.includes("vendor-chunks/") ||
    message.includes("Cannot find module './vendor-chunks/")
  );
}

/** Recover once from stale webpack chunks after deploys or dev HMR cache churn. */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const maybeReload = (message: string) => {
      if (!isStaleChunkError(message)) return;
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      maybeReload(event.message ?? String(event.error ?? ""));
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";
      maybeReload(message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
