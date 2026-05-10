"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const adminApiPattern = /\/api\/admin\//;

function isAdminHref(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href") ?? "";
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin && url.pathname.startsWith("/admin") && url.href !== window.location.href;
  } catch {
    return false;
  }
}

export function AdminLoaderMarkup() {
  return (
    <div className="sarjan-admin-page-loader" role="status" aria-live="polite" aria-label="Loading admin page">
      <div className="sarjan-admin-loader-card">
        <div className="sarjan-admin-loader-logo">
          <img src="/sarjan-assets/sarjan-logo-icon.png" alt="Sarjan Textiles" />
        </div>
        <div className="sarjan-admin-loader-text">
          <strong>Sarjan Textiles</strong>
          <span>Loading admin panel...</span>
        </div>
      </div>
    </div>
  );
}

export function AdminGlobalLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const pendingRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
    hideTimerRef.current = null;
    showTimerRef.current = null;
  };

  const show = (delay = 0) => {
    if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
    showTimerRef.current = window.setTimeout(() => setVisible(true), delay);
  };

  const hide = (delay = 420) => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (pendingRef.current <= 0) setVisible(false);
    }, delay);
  };

  useEffect(() => {
    hide(520);
    return clearTimers;
  }, []);

  useEffect(() => {
    hide(520);
  }, [pathname]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const target = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].toString() : args[0]?.url ?? "";
      const shouldTrack = adminApiPattern.test(target) || window.location.pathname.startsWith("/admin");

      if (shouldTrack) {
        pendingRef.current += 1;
        show(140);
      }

      try {
        return await originalFetch(...args);
      } finally {
        if (shouldTrack) {
          pendingRef.current = Math.max(0, pendingRef.current - 1);
          if (pendingRef.current === 0) hide(360);
        }
      }
    };

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (anchor.target || anchor.hasAttribute("download") || anchor.getAttribute("data-bs-toggle")) return;
      if (isAdminHref(anchor)) show();
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (form?.closest(".sarjan-admin-login, #wrapper")) show();
    };

    window.addEventListener("pageshow", () => hide(260));
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return visible ? <AdminLoaderMarkup /> : null;
}
