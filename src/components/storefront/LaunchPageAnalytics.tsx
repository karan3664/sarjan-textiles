import Script from "next/script";

import { GOOGLE_ANALYTICS_MEASUREMENT_ID } from "@/lib/google-analytics";

/** Loads GA on /launch immediately (no cookie gate — pre-launch landing traffic). */
export function LaunchPageAnalytics() {
  const id = GOOGLE_ANALYTICS_MEASUREMENT_ID;
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="sarjan-launch-google-analytics" strategy="afterInteractive">
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
