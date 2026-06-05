"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const visitorKey = "sarjan_visitor_id";
import { cookieConsentRequired } from "@/lib/cookie-consent-client";

const CONSENT_KEY = "sarjan-cookie-consent";

function marketingConsentGranted() {
  if (!cookieConsentRequired()) return true;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

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

    const send = () => {
      if (!marketingConsentGranted()) return;
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
    };

    send();
    window.addEventListener("sarjan-cookie-consent-changed", send);
    window.addEventListener("storage", send);
    return () => {
      window.removeEventListener("sarjan-cookie-consent-changed", send);
      window.removeEventListener("storage", send);
    };
  }, [pathname]);

  return null;
}
