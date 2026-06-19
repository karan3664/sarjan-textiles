"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  dismissAndroidAppInstallPrompt,
  isAndroidAppInstallDismissed,
  SARJAN_ANDROID_APK_PATH,
} from "@/lib/android-app-install";
import { isAndroidMobileClient } from "@/lib/storefront-device";
import { isPwaStandalone } from "@/lib/storefront-pwa";
import { SarjanButton } from "./SarjanButton";

type VersionInfo = {
  latestVersion?: string;
  apkUrl?: string;
};

export function AndroidAppInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [release, setRelease] = useState<VersionInfo | null>(null);

  useEffect(() => {
    if (!isAndroidMobileClient()) return;
    if (isPwaStandalone()) return;
    if (isAndroidAppInstallDismissed()) return;

    let cancelled = false;
    void fetch("/api/version", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VersionInfo | null) => {
        if (!cancelled && data) setRelease(data);
      })
      .catch(() => null);

    const timer = window.setTimeout(() => {
      if (!cancelled) setVisible(true);
    }, 2200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    dismissAndroidAppInstallPrompt();
    setVisible(false);
  }, []);

  const install = useCallback(() => {
    const href = release?.apkUrl || SARJAN_ANDROID_APK_PATH;
    window.location.assign(href);
    dismissAndroidAppInstallPrompt();
    setVisible(false);
  }, [dismiss, release?.apkUrl]);

  if (!visible) return null;

  const versionLabel = release?.latestVersion
    ? ` v${release.latestVersion}`
    : "";

  return (
    <div
      className="sarjan-pwa-install sarjan-android-app-install"
      role="dialog"
      aria-label="Install Sarjan Textiles Android app"
      aria-live="polite"
    >
      <div className="sarjan-pwa-install__inner">
        <div className="sarjan-pwa-install__copy">
          <p className="sarjan-pwa-install__title">
            Install Sarjan Textiles App
          </p>
          <p className="sarjan-pwa-install__lead text-caption-1">
            Download the official Android app{versionLabel} for faster wholesale
            ordering, order tracking, and notifications.
          </p>
        </div>
        <div className="sarjan-pwa-install__actions">
          <SarjanButton type="button" icon="icon-check" onClick={install}>
            Install app
          </SarjanButton>
          <SarjanButton type="button" className="has-border" onClick={dismiss}>
            Not now
          </SarjanButton>
        </div>
        <p className="sarjan-android-app-install__more text-caption-1">
          <Link href="/download" onClick={dismiss}>
            Installation steps
          </Link>
        </p>
      </div>
    </div>
  );
}
