/** Cross-tab signal so open admin panels refresh notifications immediately. */

export const ADMIN_NOTIF_CHANNEL = "sarjan-admin-notifications";
export const ADMIN_NOTIF_REFRESH_EVENT = "sarjan-admin-notifications-refresh";

export function requestAdminNotificationRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_NOTIF_REFRESH_EVENT));
  try {
    const channel = new BroadcastChannel(ADMIN_NOTIF_CHANNEL);
    channel.postMessage({ type: "refresh" });
    channel.close();
  } catch {
    /* BroadcastChannel unavailable */
  }
}
