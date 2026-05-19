import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./storefront-template.css";
import { siteSettings } from "@/data/mock";
import { AnalyticsTracker } from "@/components/storefront/AnalyticsTracker";
import { pageMetadata } from "@/lib/seo";

const googleAnalyticsId = "G-L5JB54GCZ8";

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
      <head />
      <body className="preload-wrapper">
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
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
