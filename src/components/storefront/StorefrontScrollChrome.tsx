"use client";

import { useEffect } from "react";
import { useStorefrontScrollChrome } from "@/hooks/useStorefrontScrollChrome";

function syncHeaderOffset() {
  const header = document.getElementById("header");
  if (!header) return;
  document.documentElement.style.setProperty(
    "--sarjan-header-height",
    `${header.offsetHeight}px`,
  );
}

export function StorefrontScrollChrome() {
  const { enabled, chromeHidden, elevated } = useStorefrontScrollChrome();

  useEffect(() => {
    if (!enabled) {
      document.body.classList.remove(
        "sarjan-scroll-chrome",
        "sarjan-chrome-hidden",
        "sarjan-chrome-elevated",
      );
      return;
    }

    const body = document.body;
    body.classList.add("sarjan-scroll-chrome");

    return () => {
      body.classList.remove(
        "sarjan-scroll-chrome",
        "sarjan-chrome-hidden",
        "sarjan-chrome-elevated",
      );
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const body = document.body;
    body.classList.toggle("sarjan-chrome-hidden", chromeHidden);
    body.classList.toggle("sarjan-chrome-elevated", elevated);
  }, [enabled, chromeHidden, elevated]);

  useEffect(() => {
    const header = document.getElementById("header");
    if (!header) return;

    syncHeaderOffset();

    const onResize = () => syncHeaderOffset();
    window.addEventListener("resize", onResize);

    const observer = new ResizeObserver(() => syncHeaderOffset());
    observer.observe(header);

    return () => {
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      document.documentElement.style.removeProperty("--sarjan-header-height");
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const header = document.getElementById("header");
    if (!header) return;

    header.classList.add("sarjan-sticky-header");

    const styleGuard = new MutationObserver(() => {
      if (header.style.top) {
        header.style.removeProperty("top");
      }
    });
    styleGuard.observe(header, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => {
      styleGuard.disconnect();
      header.classList.remove("sarjan-sticky-header");
    };
  }, [enabled]);

  return null;
}
