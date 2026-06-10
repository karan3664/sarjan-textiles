import type { Metadata } from "next";
import "./globals.css";
import { siteSettings } from "@/data/mock";
import { STOREFRONT_TEMPLATE_STYLESHEETS } from "@/lib/storefront-template-styles";
import { AnalyticsTracker } from "@/components/storefront/AnalyticsTracker";
import { CookieConsentBanner } from "@/components/storefront/CookieConsentBanner";
import { SiteAnalytics } from "@/components/storefront/SiteAnalytics";
import { pageMetadata } from "@/lib/seo";
import { localeFromHeaders } from "@/lib/server-locale";

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
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      {
        url: siteSettings.logoIcon,
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: siteSettings.favicon,
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/sarjan-assets/sarjan-favicon-192.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
  },
  category: "B2B Textile Platform",
  applicationName: siteSettings.brandName,
  creator: siteSettings.brandName,
  publisher: siteSettings.brandName,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await localeFromHeaders();
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        {STOREFRONT_TEMPLATE_STYLESHEETS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        <link rel="stylesheet" href="/sarjan-hero.css" />
        <link rel="stylesheet" href="/sarjan-storefront-overrides.css" />
        {/* After Modave — CTA defaults + hover (must load after template CSS) */}
        <link rel="stylesheet" href="/sarjan-button-overrides.css" />
        <link rel="stylesheet" href="/storefront-buttons.css" />
        <link rel="stylesheet" href="/sarjan-pdp-cta.css?v=20260526d" />
      </head>
      <body className="sarjan-storefront" suppressHydrationWarning>
        <SiteAnalytics />
        <AnalyticsTracker />
        <CookieConsentBanner />
        {children}
      </body>
    </html>
  );
}
