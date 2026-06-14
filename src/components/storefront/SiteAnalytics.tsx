"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { cookieConsentRequired } from "@/lib/cookie-consent-client";
import { GOOGLE_ANALYTICS_MEASUREMENT_ID } from "@/lib/google-analytics";

const CONSENT_KEY = "sarjan-cookie-consent";

function consentRequired() {
  return cookieConsentRequired();
}

function hasConsent() {
  if (!consentRequired()) return true;
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function SiteAnalytics() {
  const pathname = usePathname();
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

  if (pathname === "/launch" || !gaOn || !GOOGLE_ANALYTICS_MEASUREMENT_ID) {
    return null;
  }

  const id = GOOGLE_ANALYTICS_MEASUREMENT_ID;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="sarjan-google-analytics" strategy="afterInteractive">
        {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${id}');
          `}
      </Script>
    </>
  );
}
