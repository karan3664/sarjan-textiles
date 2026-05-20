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
      </head>
      <body className="preload-wrapper">
        <SiteAnalytics />
        <AnalyticsTracker />
        <CookieConsentBanner />
        {children}
      </body>
    </html>
  );
}
