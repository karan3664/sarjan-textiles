"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  playAdminNotificationChime,
  unlockAdminNotificationAudio,
} from "@/lib/admin-notification-sound";

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
      setItems(data.items ?? []);
      setUnread(data.unreadCount ?? 0);
      setError(null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
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
    })();
    void loadNotifications();
    const t = window.setInterval(() => void loadNotifications(), 30_000);
    return () => window.clearInterval(t);
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
      setItems(data.items ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* still redirect */
    }
    window.location.href = "/admin/login";
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
                      src="/sarjan-assets/sarjan-logo-icon.png"
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
                  <button
                    type="button"
                    className="user-item link btn btn-link text-start w-100 text-decoration-none border-0"
                    onClick={() => void logout()}
                  >
                    <div className="text-title text-danger">Log out</div>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
