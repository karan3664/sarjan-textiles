"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";

const CONSENT_KEY = "sarjan-cookie-consent";

function consentRequired() {
  return process.env.NEXT_PUBLIC_COOKIE_CONSENT === "true";
}

function hasConsent() {
  if (!consentRequired()) return true;
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

const googleAnalyticsId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

export function SiteAnalytics() {
  const [gaOn, setGaOn] = useState(false);

  const sync = useCallback(() => {
    setGaOn(hasConsent());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("sarjan-cookie-consent-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sarjan-cookie-consent-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  if (!gaOn || !googleAnalyticsId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
        strategy="afterInteractive"
      />
      <Script id="sarjan-google-analytics" strategy="afterInteractive">
        {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}');
          `}
      </Script>
    </>
  );
}
