/** Phone / tablet browsers — not desktop web. */
export function isMobileStorefrontClient(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  if (/iPad/i.test(ua)) return true;
  return window.matchMedia("(max-width: 768px) and (pointer: coarse)").matches;
}

/** Android phone browser (APK install prompt). */
export function isAndroidMobileClient(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua);
}

/** Desktop / laptop web — PWA install prompt only here. */
export function isDesktopWebClient(): boolean {
  return !isMobileStorefrontClient();
}
