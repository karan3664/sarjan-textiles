/** Browser-only helpers for client JWT (localStorage + cookie session). */

import type { StoredClient } from "@/lib/client-session";

const SESSION_FLASH_KEY = "sarjan-login-flash";
const SLIDING_REFRESH_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

function decodeClientTokenPayload(token: string): { exp?: number } | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const padded = segment
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(segment.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

export function isClientTokenExpired(token?: string | null) {
  const value = token?.trim() || clientAuthToken();
  if (!value) return true;
  const payload = decodeClientTokenPayload(value);
  if (!payload?.exp || !Number.isFinite(payload.exp)) return true;
  return Date.now() > payload.exp;
}

export function clientSessionNeedsRefresh(token?: string | null) {
  const value = token?.trim() || clientAuthToken();
  if (!value) return false;
  const payload = decodeClientTokenPayload(value);
  if (!payload?.exp || !Number.isFinite(payload.exp)) return true;
  return payload.exp - Date.now() < SLIDING_REFRESH_WINDOW_MS;
}

export function readStoredClientProfile(): StoredClient | null {
  if (typeof window === "undefined") return null;
  try {
    const client = JSON.parse(
      localStorage.getItem("sarjan-client") ?? "null",
    ) as StoredClient | null;
    if (!client?.id?.trim()) return null;
    return client;
  } catch {
    return null;
  }
}

export function clearExpiredClientSession(
  message = "Your session expired. Please sign in again.",
) {
  clearClientSessionLocal();
  try {
    sessionStorage.setItem(SESSION_FLASH_KEY, message);
  } catch {
    /* ignore */
  }
  void fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
  window.dispatchEvent(new CustomEvent("sarjan-auth-updated"));
}

export function clientAuthToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("sarjan-client-token")?.trim() ?? "";
}

export function clientAuthHeaders(): HeadersInit {
  const token = clientAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clientAuthJsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...clientAuthHeaders(),
  };
}

export function readStoredClientId() {
  if (typeof window === "undefined") return "";
  try {
    const client = JSON.parse(
      localStorage.getItem("sarjan-client") ?? "null",
    ) as { id?: string } | null;
    return client?.id?.trim() ?? "";
  } catch {
    return "";
  }
}

export function isClientApproved() {
  if (typeof window === "undefined") return false;
  try {
    const client = JSON.parse(
      localStorage.getItem("sarjan-client") ?? "null",
    ) as { status?: string } | null;
    return client?.status === "approved";
  } catch {
    return false;
  }
}

export function catalogFetchInit(init?: RequestInit): RequestInit {
  return {
    credentials: "include",
    ...init,
    headers: {
      ...clientAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  };
}

export function clearClientSessionLocal() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("sarjan-client");
  localStorage.removeItem("sarjan-client-token");
  window.dispatchEvent(new CustomEvent("sarjan-auth-updated"));
}

/**
 * Clears local session and navigates through /api/auth/logout so the HttpOnly
 * cookie is removed before landing on login (avoids middleware redirect loop).
 */
export function logoutClientSession(redirectTo = "/login") {
  clearClientSessionLocal();
  const params = new URLSearchParams({ redirect: "1" });
  if (redirectTo && redirectTo !== "/login") {
    params.set("next", redirectTo);
  }
  window.location.assign(`/api/auth/logout?${params.toString()}`);
}

export function persistClientSession(token: string, client: StoredClient) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sarjan-client-token", token);
  localStorage.setItem("sarjan-client", JSON.stringify(client));
  window.dispatchEvent(new CustomEvent("sarjan-auth-updated"));
  void import("@/lib/cart-client")
    .then(({ syncCartWithApi }) => syncCartWithApi())
    .catch(() => undefined);
  void import("@/lib/saved-lists-sync")
    .then(({ pullSavedListsFromServer }) => pullSavedListsFromServer())
    .catch(() => undefined);
}

export type ClientLoginResult =
  | { ok: true; client: StoredClient; token: string }
  | { ok: false; error: string };

/** Sync localStorage from HttpOnly cookie (after login redirect or stale local cache). */
export async function restoreClientSessionFromCookie(): Promise<ClientLoginResult> {
  const res = await fetch("/api/auth/session", { credentials: "include" });
  let data: { error?: string; token?: string; client?: StoredClient } = {};
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Session check failed" };
  }
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Not signed in" };
  }
  if (!data.token || !data.client?.id) {
    return { ok: false, error: "Session check failed" };
  }
  persistClientSession(data.token, data.client);
  return { ok: true, client: data.client, token: data.token };
}

/**
 * Validates the current session with the server, refreshes token when needed,
 * and clears stale localStorage when the cookie/JWT is no longer valid.
 */
export async function validateAndRefreshClientSession(): Promise<ClientLoginResult> {
  const token = clientAuthToken();
  if (!token) {
    return restoreClientSessionFromCookie();
  }
  if (isClientTokenExpired(token)) {
    clearExpiredClientSession();
    return { ok: false, error: "Session expired" };
  }

  const shouldRefresh =
    clientSessionNeedsRefresh(token) || !readStoredClientProfile()?.id?.trim();

  if (!shouldRefresh) {
    const client = readStoredClientProfile();
    if (client) {
      return { ok: true, client, token };
    }
  }

  const restored = await restoreClientSessionFromCookie();
  if (restored.ok) {
    return restored;
  }

  clearExpiredClientSession(
    restored.error === "Not signed in"
      ? "Your session expired. Please sign in again."
      : (restored.error ?? "Session expired. Please sign in again."),
  );
  return restored;
}

/** POST /api/auth/login and save session in localStorage + cookie. */
export async function loginClientSession(
  email: string,
  password: string,
): Promise<ClientLoginResult> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: email.trim(), password }),
  });
  let data: { error?: string; token?: string; client?: StoredClient } = {};
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Login failed" };
  }
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Login failed" };
  }
  if (!data.token || !data.client) {
    return { ok: false, error: "Login failed" };
  }
  persistClientSession(data.token, data.client);
  return { ok: true, client: data.client, token: data.token };
}
