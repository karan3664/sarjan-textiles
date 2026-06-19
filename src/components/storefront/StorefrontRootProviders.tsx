"use client";

import "@/styles/storefront.css";
import "@/styles/dark-mode.css";
import "@/styles/emoji-picker.css";

import { StorefrontThemeProvider } from "@/components/storefront/StorefrontThemeProvider";
import { AnalyticsTracker } from "@/components/storefront/AnalyticsTracker";
import { CookieConsentBanner } from "@/components/storefront/CookieConsentBanner";
import { MetaPixel } from "@/components/storefront/MetaPixel";
import { SiteAnalytics } from "@/components/storefront/SiteAnalytics";
import { StorefrontOriginGuard } from "@/components/storefront/StorefrontOriginGuard";
import { StorefrontPwaRegistration } from "@/components/storefront/StorefrontPwaRegistration";
import { StorefrontSessionFlash } from "@/components/storefront/StorefrontSessionFlash";

export function StorefrontRootProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StorefrontThemeProvider>
      <SiteAnalytics />
      <MetaPixel />
      <AnalyticsTracker />
      <CookieConsentBanner />
      <StorefrontOriginGuard />
      <StorefrontPwaRegistration />
      <StorefrontSessionFlash />
      {children}
    </StorefrontThemeProvider>
  );
}
