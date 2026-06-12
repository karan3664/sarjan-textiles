export const SARJAN_SW_PATH = "/sarjan-sw.js";
export const SARJAN_SW_SCOPE = "/";
export const SARJAN_OFFLINE_PATH = "/offline";

export const SARJAN_PWA_INSTALL_DISMISS_KEY = "sarjan-pwa-install-dismissed-at";
/** Days before showing the install prompt again after dismiss. */
export const SARJAN_PWA_INSTALL_DISMISS_DAYS = 14;

export const SARJAN_PWA_INSTALL_READY_EVENT = "sarjan-pwa-install-ready";
export const SARJAN_PWA_INSTALLED_EVENT = "sarjan-pwa-installed";

export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  return Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone,
  );
}

export function shouldRegisterStorefrontServiceWorker(
  pathname: string,
): boolean {
  if (pathname === "/launch") return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/api")) return false;
  return true;
}

export function isPwaInstallDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(SARJAN_PWA_INSTALL_DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    const ms = SARJAN_PWA_INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < ms;
  } catch {
    return false;
  }
}

export function dismissPwaInstallPrompt(): void {
  try {
    localStorage.setItem(SARJAN_PWA_INSTALL_DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export async function registerStorefrontServiceWorker(): Promise<
  ServiceWorkerRegistration | undefined
> {
  if (typeof window === "undefined") return undefined;
  if (!("serviceWorker" in navigator)) return undefined;

  const registration = await navigator.serviceWorker.register(SARJAN_SW_PATH, {
    scope: SARJAN_SW_SCOPE,
  });

  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        worker.postMessage({ type: "SKIP_WAITING" });
      }
    });
  });

  return registration;
}
