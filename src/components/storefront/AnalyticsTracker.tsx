"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const visitorKey = "sarjan_visitor_id";

function makeVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(visitorKey);
    if (existing) return existing;
    const next = makeVisitorId();
    window.localStorage.setItem(visitorKey, next);
    return next;
  } catch {
    return makeVisitorId();
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const payload = {
      visitorId: getVisitorId(),
      path: `${pathname}${window.location.search}`,
      referrer: document.referrer,
    };

    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
