"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cookieConsentRequired } from "@/lib/cookie-consent-client";
import { META_PIXEL_ID, metaPixelEnabled } from "@/lib/meta-conversions";

const CONSENT_KEY = "sarjan-cookie-consent";

function hasConsent() {
  if (!cookieConsentRequired()) return true;
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function MetaPixel() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  const sync = useCallback(() => {
    setEnabled(hasConsent() && metaPixelEnabled());
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

  useEffect(() => {
    if (!enabled || pathname === "/launch") return;
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    fbq?.("track", "PageView");
  }, [enabled, pathname]);

  if (!enabled || pathname === "/launch") return null;

  return (
    <>
      <Script id="sarjan-meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
    </>
  );
}
