"use client";

import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sarjan-cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_COOKIE_CONSENT !== "true") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      /* ignore */
    }
    setVisible(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sarjan-cookie-consent-changed"));
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="sarjan-cookie-consent"
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
    >
      <div className="sarjan-cookie-consent-inner">
        <p className="text-caption-1 mb_8">
          We use essential cookies and analytics to run the storefront. See our{" "}
          <Link href="/privacy-policy" className="link text-primary">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/term-of-use" className="link text-primary">
            Terms of use
          </Link>
          .
        </p>
        <div className="d-flex gap-12 flex-wrap">
          <button
            type="button"
            className={withBtnIcon("tf-btn btn-fill radius-4")}
            onClick={accept}
          >
            <TfButtonIcon icon="icon-check">Accept</TfButtonIcon>
          </button>
          <Link
            href="/privacy-policy"
            className={withBtnIcon("tf-btn btn-white has-border radius-4")}
          >
            <TfButtonIcon icon="icon-question">Learn more</TfButtonIcon>
          </Link>
        </div>
      </div>
    </div>
  );
}
