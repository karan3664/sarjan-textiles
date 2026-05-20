/** Browser-only helpers for client JWT (localStorage + cookie session). */

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
