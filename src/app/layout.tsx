import type { Metadata } from "next";
import "./globals.css";
import { siteSettings } from "@/data/mock";

export const metadata: Metadata = {
  title: siteSettings.seo.title,
  description: siteSettings.seo.description,
  metadataBase: new URL(`https://${siteSettings.domain}`),
  icons: {
    icon: siteSettings.favicon,
    apple: siteSettings.favicon,
  },
  openGraph: {
    title: siteSettings.seo.title,
    description: siteSettings.seo.description,
    url: `https://${siteSettings.domain}`,
    siteName: siteSettings.brandName,
    images: ["/sarjan-assets/banner-textiles-studio.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/template/storefront/fonts/fonts.css" />
        <link rel="stylesheet" href="/template/storefront/fonts/font-icons.css" />
        <link rel="stylesheet" href="/template/storefront/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/template/storefront/css/swiper-bundle.min.css" />
        <link rel="stylesheet" href="/template/storefront/css/bootstrap-select.min.css" />
        <link rel="stylesheet" href="/template/storefront/css/photoswipe.css" />
        <link rel="stylesheet" href="/template/storefront/css/drift-basic.min.css" />
        <link rel="stylesheet" href="/template/storefront/css/animate.css" />
        <link rel="stylesheet" href="/template/storefront/css/styles.css" />
      </head>
      <body className="preload-wrapper">
        {children}
      </body>
    </html>
  );
}
