/** Browser-only helpers for client JWT (localStorage + cookie session). */

import type { StoredClient } from "@/lib/client-session";

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

export function persistClientSession(token: string, client: StoredClient) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sarjan-client-token", token);
  localStorage.setItem("sarjan-client", JSON.stringify(client));
  window.dispatchEvent(new CustomEvent("sarjan-auth-updated"));
}

export type ClientLoginResult =
  | { ok: true; client: StoredClient; token: string }
  | { ok: false; error: string };

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
