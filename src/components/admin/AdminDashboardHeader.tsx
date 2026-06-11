"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AdminLiveNotificationToasts,
  useAdminLiveNotificationToasts,
} from "@/components/admin/AdminLiveNotificationToasts";
import {
  ADMIN_NOTIF_CHANNEL,
  ADMIN_NOTIF_REFRESH_EVENT,
  requestAdminNotificationRefresh,
} from "@/lib/admin-notification-live";
import {
  playAdminNotificationChime,
  unlockAdminNotificationAudio,
} from "@/lib/admin-notification-sound";

const NOTIF_POLL_MS = 5000;

type Me = { admin?: { email: string; name: string; role: string } };
type NotifItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  unread: boolean;
};

export function AdminDashboardHeader() {
  const [name, setName] = useState("Admin");
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipInitialUnreadSound = useRef(true);
  const prevUnreadRef = useRef(0);
  const { toasts, dismissToast, ingestNotifications } =
    useAdminLiveNotificationToasts();

  useEffect(() => {
    const onFirstPointer = () => unlockAdminNotificationAudio();
    document.addEventListener("pointerdown", onFirstPointer, {
      capture: true,
      once: true,
    });
    return () =>
      document.removeEventListener("pointerdown", onFirstPointer, {
        capture: true,
      });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (skipInitialUnreadSound.current) {
      skipInitialUnreadSound.current = false;
      prevUnreadRef.current = unread;
      return;
    }
    if (unread > prevUnreadRef.current) {
      playAdminNotificationChime();
    }
    prevUnreadRef.current = unread;
  }, [unread, loading]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: NotifItem[];
        unreadCount: number;
      };
      const nextItems = data.items ?? [];
      ingestNotifications(nextItems);
      setItems(nextItems);
      setUnread(data.unreadCount ?? 0);
      setError(null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [ingestNotifications]);

  const loadAdminSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/me", {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as Me;
        if (data.admin?.name) setName(data.admin.name);
        if (data.admin?.email) setEmail(data.admin.email);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadAdminSession();
    const onSession = () => void loadAdminSession();
    window.addEventListener("sarjan-admin-session-updated", onSession);
    return () =>
      window.removeEventListener("sarjan-admin-session-updated", onSession);
  }, [loadAdminSession]);

  useEffect(() => {
    void loadNotifications();

    const poll = window.setInterval(
      () => void loadNotifications(),
      NOTIF_POLL_MS,
    );

    const onRefresh = () => void loadNotifications();
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadNotifications();
    };

    window.addEventListener(ADMIN_NOTIF_REFRESH_EVENT, onRefresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onVisible);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(ADMIN_NOTIF_CHANNEL);
      channel.onmessage = onRefresh;
    } catch {
      /* ignore */
    }

    return () => {
      window.clearInterval(poll);
      window.removeEventListener(ADMIN_NOTIF_REFRESH_EVENT, onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
      channel?.close();
    };
  }, [loadNotifications]);

  const postNotifAction = async (action: "readAll" | "clear") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as {
        items?: NotifItem[];
        unreadCount?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not update notifications.");
        return;
      }
      const nextItems = data.items ?? [];
      ingestNotifications(nextItems);
      setItems(nextItems);
      setUnread(data.unreadCount ?? 0);
      requestAdminNotificationRefresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const iconFor = (kind: string) => {
    if (kind === "order") return "icon-dollar";
    if (kind === "comment") return "icon-message";
    if (kind === "client") return "icon-users";
    return "icon-mail";
  };

  return (
    <>
      <AdminLiveNotificationToasts toasts={toasts} onDismiss={dismissToast} />
      <div className="header-dashboard">
        <div className="wrap">
          <div className="header-left">
            <button
              type="button"
              className="sarjan-admin-toggle sarjan-admin-toggle-open"
              data-admin-menu-toggle
              aria-label="Toggle sidebar"
            >
              <i className="icon-chevron-right" />
            </button>
          </div>
          <div className="header-grid">
            <div className="header-btn">
              <div className="popup-wrap noti type-header">
                <div className="dropdown">
                  <button
                    className="btn btn-secondary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    onClick={() => {
                      unlockAdminNotificationAudio();
                      void loadNotifications();
                    }}
                  >
                    <span
                      className={`header-item${unread > 0 ? " has-dot" : ""}`}
                    >
                      <i className="icon-bell" />
                    </span>
                  </button>
                  <ul
                    className="dropdown-menu dropdown-menu-end has-content sarjan-admin-notif-menu"
                    style={{ minWidth: "min(100vw - 24px, 360px)" }}
                  >
                    <li className="sarjan-admin-notif-menu-head d-flex align-items-center justify-content-between gap-2">
                      <h6 className="mb-0">Notifications</h6>
                      <div className="d-flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={busy || loading || items.length === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            void postNotifAction("readAll");
                          }}
                        >
                          Read all
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={busy || loading || items.length === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            void postNotifAction("clear");
                          }}
                        >
                          Clear list
                        </button>
                      </div>
                    </li>
                    {error ? (
                      <li className="px-3 py-2 text-danger small">{error}</li>
                    ) : null}
                    <li className="sarjan-admin-notif-menu-scroll-wrap">
                      <div className="sarjan-admin-notif-menu-scroll">
                        {loading ? (
                          <div className="py-3 text-caption-1">Loading…</div>
                        ) : items.length === 0 ? (
                          <div className="py-3 text-caption-1 text-muted">
                            No recent activity for your role.
                          </div>
                        ) : (
                          items.map((n) => (
                            <Link
                              key={n.id}
                              href={n.href}
                              className={`dropdown-item sarjan-admin-notif-item${n.unread ? " fw-semibold" : ""}`}
                            >
                              <div className="notifications-item item-2">
                                <div className="image">
                                  <i className={iconFor(n.kind)} />
                                </div>
                                <div>
                                  <div className="text-title">{n.title}</div>
                                  <div className="text-caption-1">{n.body}</div>
                                  <div className="text-caption-2 text-muted mt-1">
                                    {fmt(n.createdAt)}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="line1" />
            <div className="popup-wrap user type-header">
              <div className="dropdown">
                <button
                  className="btn btn-secondary dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <span className="header-user wg-user">
                    <span className="image sarjan-admin-header-avatar-wrap">
                      <img
                        src="/sarjan-assets/sarjan-logo-full.png"
                        alt="Sarjan Textiles"
                        width={38}
                        height={38}
                        className="sarjan-admin-header-avatar-img"
                      />
                    </span>
                    <span className="content">
                      <span className="text-button name">{name}</span>
                      {email ? (
                        <span
                          className="text-caption-2 text-muted d-block text-start text-truncate"
                          style={{ maxWidth: 160 }}
                        >
                          {email}
                        </span>
                      ) : null}
                    </span>
                    <i className="icon icon-arrow-down" />
                  </span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end has-content sarjan-admin-user-menu">
                  <li>
                    <Link href="/admin/account" className="user-item link">
                      <div className="text-title">Profile & password</div>
                      <div className="text-caption-1 text-muted">
                        Update display name and sign-in password
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link href="/" className="user-item link">
                      <div className="text-title">Front store</div>
                    </Link>
                  </li>
                  <li>
                    <a
                      href="/api/admin/auth/logout"
                      className="user-item link sarjan-admin-logout-btn"
                    >
                      <div className="text-title text-danger">Log out</div>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
