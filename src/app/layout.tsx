import type { Metadata } from "next";
import "./globals.css";
import { siteSettings } from "@/data/mock";
import { STOREFRONT_TEMPLATE_STYLESHEETS } from "@/lib/storefront-template-styles";
import { AnalyticsTracker } from "@/components/storefront/AnalyticsTracker";
import { CookieConsentBanner } from "@/components/storefront/CookieConsentBanner";
import { SiteAnalytics } from "@/components/storefront/SiteAnalytics";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: siteSettings.seo.title,
    description: siteSettings.seo.description,
    path: "/",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    keywords: [
      "Sarjan Textiles",
      "B2B textiles",
      "wholesale textile catalog",
      "printed shirts",
      "kurtas",
    ],
  }),
  metadataBase: new URL(`https://${siteSettings.domain}`),
  icons: {
    icon: siteSettings.favicon,
    apple: siteSettings.favicon,
  },
  category: "B2B Textile Platform",
  applicationName: siteSettings.brandName,
  creator: siteSettings.brandName,
  publisher: siteSettings.brandName,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        {STOREFRONT_TEMPLATE_STYLESHEETS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        <link rel="stylesheet" href="/storefront-buttons.css" />
        <link rel="stylesheet" href="/sarjan-hero.css" />
      </head>
      <body className="preload-wrapper">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function d(){document.querySelectorAll(".preload").forEach(function(n){n.style.opacity="0";n.style.pointerEvents="none";n.style.display="none";if(n.parentNode)n.parentNode.removeChild(n);});document.body.classList.remove("preload-wrapper","offcanvas-open","modal-open");document.body.style.removeProperty("overflow");document.body.style.removeProperty("padding-right");document.querySelectorAll(".offcanvas-backdrop").forEach(function(n){n.remove();});document.querySelectorAll(".offcanvas.show").forEach(function(n){n.classList.remove("show");});var h=(location.hash||"").replace(/^#/,"");if(h==="mobileMenu"||h==="mbAccount"){history.replaceState(null,"",location.pathname+location.search);}}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){setTimeout(d,300);});}else{setTimeout(d,300);}window.addEventListener("load",function(){setTimeout(d,300);});setTimeout(d,2000);})();`,
          }}
        />
        <SiteAnalytics />
        <AnalyticsTracker />
        <CookieConsentBanner />
        {children}
      </body>
    </html>
  );
}
