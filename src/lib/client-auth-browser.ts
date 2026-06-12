/** Browser-only helpers — HttpOnly cookie auth; JWT never stored in localStorage. */

import type { StoredClient } from "@/lib/client-session";

const SESSION_FLASH_KEY = "sarjan-login-flash";
const LEGACY_TOKEN_KEY = "sarjan-client-token";

function stripClientForStorage(client: StoredClient): StoredClient {
  return {
    id: client.id,
    email: client.email,
    companyName: client.companyName,
    status: client.status,
    avatarUrl: client.avatarUrl,
    city: client.city,
    gst: client.gst,
    phone: client.phone,
  };
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

/** JWT lives in HttpOnly cookie only — never exposed to JavaScript. */
export function clientAuthToken() {
  return "";
}

/** True when a client profile is cached after cookie session sync. */
export function hasLocalClientSession() {
  return Boolean(readStoredClientProfile()?.id?.trim());
}

export function clientAuthHeaders(): HeadersInit {
  return {};
}

export function clientAuthJsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

export function readStoredClientId() {
  return readStoredClientProfile()?.id?.trim() ?? "";
}

export function isClientApproved() {
  return readStoredClientProfile()?.status === "approved";
}

export function isClientTokenExpired(_token?: string | null) {
  return !readStoredClientProfile()?.id;
}

export function clientSessionNeedsRefresh() {
  return !readStoredClientProfile()?.id?.trim();
}

export function catalogFetchInit(init?: RequestInit): RequestInit {
  return {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  };
}

export function clearClientSessionLocal() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("sarjan-client");
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("sarjan-auth-updated"));
}

export function logoutClientSession(redirectTo = "/login") {
  clearClientSessionLocal();
  const params = new URLSearchParams({ redirect: "1" });
  if (redirectTo && redirectTo !== "/login") {
    params.set("next", redirectTo);
  }
  window.location.assign(`/api/auth/logout?${params.toString()}`);
}

export function persistClientSession(_token: string, client: StoredClient) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.setItem(
    "sarjan-client",
    JSON.stringify(stripClientForStorage(client)),
  );
  window.dispatchEvent(new CustomEvent("sarjan-auth-updated"));
  void import("@/lib/cart-client")
    .then(({ syncCartWithApi }) => syncCartWithApi())
    .catch(() => undefined);
  void import("@/lib/saved-lists-sync")
    .then(({ pullSavedListsFromServer }) => pullSavedListsFromServer())
    .catch(() => undefined);
}

export type ClientLoginResult =
  | { ok: true; client: StoredClient }
  | { ok: false; error: string };

export async function restoreClientSessionFromCookie(): Promise<ClientLoginResult> {
  const res = await fetch("/api/auth/session", { credentials: "include" });
  let data: { error?: string; client?: StoredClient } = {};
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Session check failed" };
  }
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Not signed in" };
  }
  if (!data.client?.id) {
    return { ok: false, error: "Session check failed" };
  }
  persistClientSession("", data.client);
  return { ok: true, client: data.client };
}

export async function validateAndRefreshClientSession(): Promise<ClientLoginResult> {
  const restored = await restoreClientSessionFromCookie();
  if (restored.ok) return restored;

  clearExpiredClientSession(
    restored.error === "Not signed in"
      ? "Your session expired. Please sign in again."
      : (restored.error ?? "Session expired. Please sign in again."),
  );
  return restored;
}

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
  let data: { error?: string; client?: StoredClient } = {};
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Login failed" };
  }
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Login failed" };
  }
  if (!data.client) {
    return { ok: false, error: "Login failed" };
  }
  persistClientSession("", data.client);
  return { ok: true, client: data.client };
}
