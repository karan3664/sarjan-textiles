"use client";

import { useCallback, useEffect, useState } from "react";
import { SarjanButton } from "./SarjanButton";
import {
  dismissPwaInstallPrompt,
  isPwaInstallDismissed,
  isPwaStandalone,
  SARJAN_PWA_INSTALLED_EVENT,
  SARJAN_PWA_INSTALL_READY_EVENT,
} from "@/lib/storefront-pwa";
import {
  isDesktopWebClient,
  isMobileStorefrontClient,
} from "@/lib/storefront-device";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isPwaStandalone()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (isMobileStorefrontClient()) return;
      if (isPwaInstallDismissed()) return;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
      window.dispatchEvent(new Event(SARJAN_PWA_INSTALL_READY_EVENT));
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      window.dispatchEvent(new Event(SARJAN_PWA_INSTALLED_EVENT));
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    dismissPwaInstallPrompt();
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      setVisible(false);
      return;
    }
    dismiss();
  }, [deferredPrompt, dismiss]);

  if (!visible || !deferredPrompt || !isDesktopWebClient()) return null;

  return (
    <div
      className="sarjan-pwa-install"
      role="dialog"
      aria-label="Install Sarjan Textiles app"
      aria-live="polite"
    >
      <div className="sarjan-pwa-install__inner">
        <div className="sarjan-pwa-install__copy">
          <p className="sarjan-pwa-install__title">Install Sarjan Textiles</p>
          <p className="sarjan-pwa-install__lead text-caption-1">
            Add the catalog to your home screen for faster access and offline
            browsing of cached pages.
          </p>
        </div>
        <div className="sarjan-pwa-install__actions">
          <SarjanButton type="button" icon="icon-check" onClick={install}>
            Install
          </SarjanButton>
          <SarjanButton type="button" className="has-border" onClick={dismiss}>
            Not now
          </SarjanButton>
        </div>
      </div>
    </div>
  );
}
