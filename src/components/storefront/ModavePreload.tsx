"use client";

import { useEffect, useState } from "react";

/**
 * Modave loading overlay — client-only so SSR HTML matches first hydrate pass.
 * (Inline layout scripts that removed .preload before hydrate caused mismatches.)
 */
export function ModavePreload() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const body = document.body;
    body.classList.add("preload-wrapper");
    setVisible(true);

    const hide = () => {
      setVisible(false);
      body.classList.remove("preload-wrapper");
      document.querySelectorAll(".preload").forEach((node) => {
        const el = node as HTMLElement;
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.style.display = "none";
        el.remove();
      });
      body.classList.remove("offcanvas-open", "modal-open");
      body.style.removeProperty("overflow");
      body.style.removeProperty("padding-right");
      document
        .querySelectorAll(".offcanvas-backdrop")
        .forEach((n) => n.remove());
      document
        .querySelectorAll(".offcanvas.show")
        .forEach((n) => n.classList.remove("show"));
      const h = (location.hash || "").replace(/^#/, "");
      if (h === "mobileMenu" || h === "mbAccount") {
        history.replaceState(null, "", location.pathname + location.search);
      }
    };

    if (document.readyState === "complete") {
      const t = window.setTimeout(hide, 300);
      return () => window.clearTimeout(t);
    }

    const onReady = () => window.setTimeout(hide, 300);
    document.addEventListener("DOMContentLoaded", onReady);
    window.addEventListener("load", onReady);
    const fallback = window.setTimeout(hide, 2000);

    return () => {
      document.removeEventListener("DOMContentLoaded", onReady);
      window.removeEventListener("load", onReady);
      window.clearTimeout(fallback);
      body.classList.remove("preload-wrapper");
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="preload preload-container">
      <div className="preload-logo">
        <div className="spinner" />
      </div>
    </div>
  );
}
