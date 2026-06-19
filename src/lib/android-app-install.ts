export const SARJAN_ANDROID_INSTALL_DISMISS_KEY =
  "sarjan-android-app-install-dismissed-at";

export const SARJAN_ANDROID_INSTALL_DISMISS_DAYS = 14;

export const SARJAN_ANDROID_APK_PATH = "/api/download/apk";

export function isAndroidAppInstallDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(SARJAN_ANDROID_INSTALL_DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    const ms = SARJAN_ANDROID_INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < ms;
  } catch {
    return false;
  }
}

export function dismissAndroidAppInstallPrompt(): void {
  try {
    localStorage.setItem(
      SARJAN_ANDROID_INSTALL_DISMISS_KEY,
      String(Date.now()),
    );
  } catch {
    /* ignore */
  }
}
