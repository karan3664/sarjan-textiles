"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type LiveNotifToast = {
  toastId: string;
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
};

const TOAST_VISIBLE_MS = 7500;
const TOAST_MAX_STACK = 4;
const KNOWN_STORAGE_KEY = "sarjan-admin-notif-known";
const INIT_STORAGE_KEY = "sarjan-admin-notif-init";
const RECENT_ACTIVITY_MS = 5 * 60 * 1000;

function iconFor(kind: string) {
  if (kind === "order") return "icon-dollar";
  if (kind === "comment") return "icon-message";
  if (kind === "client") return "icon-users";
  return "icon-mail";
}

function loadKnownIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(KNOWN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveKnownIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(KNOWN_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota */
  }
}

function isRecentActivity(createdAt: string) {
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= RECENT_ACTIVITY_MS;
}

export function AdminLiveNotificationToasts({
  toasts,
  onDismiss,
}: {
  toasts: LiveNotifToast[];
  onDismiss: (toastId: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !toasts.length) return null;

  return createPortal(
    <div
      className="sarjan-admin-toast-stack"
      aria-live="polite"
      aria-label="Live notifications"
    >
      {toasts.map((toast) => (
        <div className="sarjan-admin-toast" key={toast.toastId} role="alert">
          <Link href={toast.href} className="sarjan-admin-toast__link">
            <span className="sarjan-admin-toast__icon" aria-hidden>
              <i className={iconFor(toast.kind)} />
            </span>
            <span className="sarjan-admin-toast__text">
              <span className="sarjan-admin-toast__title">{toast.title}</span>
              <span className="sarjan-admin-toast__body">{toast.body}</span>
            </span>
          </Link>
          <button
            type="button"
            className="sarjan-admin-toast__close"
            aria-label="Dismiss notification"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDismiss(toast.toastId);
            }}
          >
            <i className="icon icon-x" aria-hidden />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function useAdminLiveNotificationToasts() {
  const [toasts, setToasts] = useState<LiveNotifToast[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());
  const knownIdsRef = useRef<Set<string>>(loadKnownIds());

  const dismissToast = useCallback((toastId: string) => {
    const timeout = timeoutsRef.current.get(toastId);
    if (timeout) window.clearTimeout(timeout);
    timeoutsRef.current.delete(toastId);
    setToasts((current) =>
      current.filter((toast) => toast.toastId !== toastId),
    );
  }, []);

  const pushToast = useCallback(
    (item: {
      id: string;
      kind: string;
      title: string;
      body: string;
      href: string;
    }) => {
      const toastId = `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const toast: LiveNotifToast = { toastId, ...item };

      setToasts((current) => {
        const next = [...current, toast];
        if (next.length <= TOAST_MAX_STACK) return next;
        const dropped = next.slice(0, next.length - TOAST_MAX_STACK);
        dropped.forEach((t) => {
          const timeout = timeoutsRef.current.get(t.toastId);
          if (timeout) window.clearTimeout(timeout);
          timeoutsRef.current.delete(t.toastId);
        });
        return next.slice(-TOAST_MAX_STACK);
      });

      const timeout = window.setTimeout(
        () => dismissToast(toastId),
        TOAST_VISIBLE_MS,
      );
      timeoutsRef.current.set(toastId, timeout);
    },
    [dismissToast],
  );

  const ingestNotifications = useCallback(
    (
      items: Array<{
        id: string;
        kind: string;
        title: string;
        body: string;
        href: string;
        createdAt: string;
        unread: boolean;
      }>,
    ) => {
      const known = knownIdsRef.current;
      const initialized = sessionStorage.getItem(INIT_STORAGE_KEY) === "1";

      if (!initialized) {
        for (const item of items) {
          if (!known.has(item.id) && isRecentActivity(item.createdAt)) {
            pushToast(item);
          }
          known.add(item.id);
        }
        sessionStorage.setItem(INIT_STORAGE_KEY, "1");
        saveKnownIds(known);
        return;
      }

      for (const item of items) {
        if (!known.has(item.id)) {
          pushToast(item);
          known.add(item.id);
        }
      }
      saveKnownIds(known);
    },
    [pushToast],
  );

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  return { toasts, dismissToast, ingestNotifications };
}
