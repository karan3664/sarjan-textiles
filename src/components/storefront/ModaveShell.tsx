import { ModaveFooter } from "./ModaveFooter";
import { ModaveHeader } from "./ModaveHeader";
import { ModaveModals } from "./ModaveModals";
import { CompareDrawer } from "./CompareDrawer";
import { ModavePreload } from "./ModavePreload";
import { OffcanvasRouteGuard } from "./OffcanvasRouteGuard";
import { OrderBotWidget } from "./OrderBotWidget";
import { AbandonedCartResumeBanner } from "./AbandonedCartResumeBanner";
import { SavedListsSync } from "./SavedListsSync";
import { ClientSessionBootstrap } from "./ClientSessionBootstrap";
import { SarjanButtonHoverFix } from "./SarjanButtonHoverFix";
import { TemplateScripts } from "./TemplateScripts";
import { normalizeBrandLogo } from "@/data/site";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";
import { getStorefrontHeaderData } from "@/lib/storefront-header-data";
import { MobileBottomNav } from "./MobileBottomNav";
import { StorefrontScrollChrome } from "./StorefrontScrollChrome";
import { PwaInstallPrompt } from "./PwaInstallPrompt";

export async function ModaveShell({ children }: { children: React.ReactNode }) {
  const locale = getCacheableStorefrontLocale();
  const header = await getStorefrontHeaderData(locale);
  const cms = await getCachedCmsSnapshot();
  const brandLogo = normalizeBrandLogo(cms.siteSettings.logo);

  return (
    <>
      <button id="scroll-top" aria-label="Scroll to top">
        <svg
          width="24"
          height="25"
          viewBox="0 0 24 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 11.9175L12 2.91748L21 11.9175H16.5V20.1675C16.5 20.3664 16.421 20.5572 16.2803 20.6978C16.1397 20.8385 15.9489 20.9175 15.75 20.9175H8.25C8.05109 20.9175 7.86032 20.8385 7.71967 20.6978C7.57902 20.5572 7.5 20.3664 7.5 20.1675V11.9175H3Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <ModavePreload />
      <a href="#main-content" className="sarjan-skip-link">
        Skip to main content
      </a>
      <div id="wrapper">
        <StorefrontScrollChrome />
        <OffcanvasRouteGuard />
        <ModaveHeader
          key={locale}
          initialLocale={header.locale}
          initialLogo={brandLogo}
          initialNavItems={header.items}
          initialCategories={header.categories}
          initialHubs={header.hubs}
        />
        <AbandonedCartResumeBanner />
        <SavedListsSync />
        <ClientSessionBootstrap />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <ModaveFooter />
        <MobileBottomNav />
        <CompareDrawer />
        <TemplateScripts />
      </div>
      <ModaveModals />
      <SarjanButtonHoverFix />
      <OrderBotWidget />
      <PwaInstallPrompt />
    </>
  );
}
