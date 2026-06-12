"use client";

import { useEffect } from "react";

/**
 * Service worker disabled — an older worker returned Response.error() on
 * navigation and caused Chrome ERR_FAILED (users could not load / or /launch).
 * Unregister on every storefront page until PWA caching is re-enabled safely.
 */
export function StorefrontPwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    void (async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith("sarjan-"))
            .map((key) => caches.delete(key)),
        );
      }
    })();
  }, []);

  return null;
}
