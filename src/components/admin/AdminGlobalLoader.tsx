"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function isAdminHref(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href") ?? "";
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  )
    return false;
  try {
    const url = new URL(href, window.location.href);
    return (
      url.origin === window.location.origin &&
      url.pathname.startsWith("/admin") &&
      url.href !== window.location.href
    );
  } catch {
    return false;
  }
}

export function AdminLoaderMarkup() {
  return (
    <div
      className="sarjan-admin-page-loader"
      role="status"
      aria-live="polite"
      aria-label="Loading admin page"
    >
      <div className="sarjan-admin-loader-card">
        <div className="sarjan-admin-loader-logo">
          <img
            src="/sarjan-assets/sarjan-logo-full.png"
            alt="Sarjan Textiles"
          />
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
  const hideTimerRef = useRef<number | null>(null);
  const lastShowRef = useRef(0);
  const hasMountedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const show = useCallback(() => {
    const now = Date.now();
    if (now - lastShowRef.current < 650) return;
    lastShowRef.current = now;
    clearTimers();
    setVisible(true);
  }, [clearTimers]);

  const hide = useCallback((delay = 420) => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, delay);
  }, []);

  useEffect(() => {
    hide(520);
    return clearTimers;
  }, [hide, clearTimers]);

  useEffect(() => {
    if (hasMountedRef.current) hide(360);
    else hasMountedRef.current = true;
  }, [pathname, hide]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      if (
        anchor.target ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("data-bs-toggle")
      )
        return;
      if (isAdminHref(anchor)) show();
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (form?.closest(".sarjan-admin-login")) return;
      if (form?.closest("#wrapper")) show();
    };

    const onPageShow = () => hide(260);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [show, hide]);

  return visible ? <AdminLoaderMarkup /> : null;
}
