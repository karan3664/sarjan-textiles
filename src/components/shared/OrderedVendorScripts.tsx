"use client";

import { useEffect } from "react";

const loadPromises = new Map<string, Promise<void>>();

function stableScriptId(scope: string, filename: string): string {
  return `sarjan-vendor-${scope}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
}

/**
 * Loads third-party template scripts in strict order. next/script assigns src
 * before toggling async off, and dynamic scripts default to async — so jQuery
 * can lose the race to carousel.js / main.js. This helper sets async=false
 * before src and chains with await.
 */
function loadVendorScriptOnce(src: string, elementId: string): Promise<void> {
  const cached = loadPromises.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.id = elementId;
    el.async = false;
    el.addEventListener(
      "load",
      () => {
        resolve();
      },
      { once: true },
    );
    el.addEventListener(
      "error",
      () => {
        loadPromises.delete(src);
        reject(new Error(`Failed to load script: ${src}`));
      },
      { once: true },
    );
    el.src = src;
    document.body.appendChild(el);
  });

  loadPromises.set(src, promise);
  return promise;
}

export function OrderedVendorScripts({
  scope,
  basePath,
  files,
  version,
}: {
  scope: string;
  basePath: string;
  files: readonly string[];
  version?: string;
}) {
  const signature = files.join("\0");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const query =
        version !== undefined && version !== ""
          ? `?v=${encodeURIComponent(version)}`
          : "";
      const fileList = signature.split("\0");
      try {
        for (const file of fileList) {
          if (cancelled) return;
          const src = `${basePath}/${file}${query}`;
          const id = stableScriptId(scope, file);
          await loadVendorScriptOnce(src, id);
        }
      } catch {
        // Template JS is best-effort; avoid breaking the app shell.
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [scope, basePath, signature, version]);

  return null;
}
