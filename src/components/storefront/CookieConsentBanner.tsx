"use client";

import Link from "next/link";
import { SarjanButton } from "./SarjanButton";
import { useCallback, useEffect, useState } from "react";
import { cookieConsentRequired } from "@/lib/cookie-consent-client";

const STORAGE_KEY = "sarjan-cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!cookieConsentRequired()) return;
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
          <SarjanButton type="button" icon="icon-check" onClick={accept}>
            Accept
          </SarjanButton>
          <SarjanButton
            href="/privacy-policy"
            icon="icon-question"
            className="has-border"
          >
            Learn more
          </SarjanButton>
        </div>
      </div>
    </div>
  );
}
