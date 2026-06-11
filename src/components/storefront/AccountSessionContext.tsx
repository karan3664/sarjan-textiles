"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clientStatusAuthError } from "@/lib/client-status-auth";
import {
  clientAuthHeaders,
  clientAuthToken,
  logoutClientSession,
  restoreClientSessionFromCookie,
} from "@/lib/client-auth-browser";
import { sortOrdersNewestFirst } from "@/lib/client-orders-sort";

export type AccountClient = {
  id: string;
  email: string;
  companyName: string;
  gst?: string;
  city?: string;
  phone?: string;
  avatarUrl?: string;
  status?: "pending" | "approved" | "rejected" | "inactive";
  address?: {
    contactName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gst?: string;
    ownerLegalName?: string;
    transport?: string;
    defaultAddressId?: string;
    saved?: Array<{
      id: string;
      label?: string;
      contactName?: string;
      phone?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      gst?: string;
      transport?: string;
      ownerLegalName?: string;
    }>;
  };
};

export type AccountOrder = {
  id: string;
  clientId: string;
  clientEmail: string;
  status: string;
  paymentMode: "cheque";
  creditDays: number;
  subtotal: number;
  tax?: number;
  shipping?: number;
  total?: number;
  dispatchAddress: string;
  dispatchDate?: string;
  transportDetails?: string;
  lrNumber?: string;
  courierDetails?: string;
  vehicleDetails?: string;
  trackingNotes?: string;
  dispatchHistory?: Array<{ status: string; note?: string; createdAt: string }>;
  note?: string;
  placedVia?: "storefront" | "ai_bot";
  createdAt: string;
  items: Array<{
    slug: string;
    name: string;
    color: string;
    sizes: string[];
    setQuantity: number;
    piecesPerSet: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

type AccountSessionValue = {
  client: AccountClient | null;
  orders: AccountOrder[];
  loading: boolean;
  setClient: (client: AccountClient | null) => void;
  refreshOrders: () => Promise<void>;
};

const AccountSessionContext = createContext<AccountSessionValue | null>(null);

function readClient(): AccountClient | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(
      localStorage.getItem("sarjan-client") ?? "null",
    ) as AccountClient | null;
    if (!parsed?.id?.trim() || !parsed?.email?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function stripAvatarCacheQuery(url?: string) {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  const index = trimmed.indexOf("?");
  return index === -1 ? trimmed : trimmed.slice(0, index);
}

export function persistAccountClient(client: AccountClient) {
  const stored: AccountClient = {
    ...client,
    avatarUrl: stripAvatarCacheQuery(client.avatarUrl),
  };
  localStorage.setItem("sarjan-client", JSON.stringify(stored));
  window.dispatchEvent(new CustomEvent("sarjan-auth-updated"));
  return stored;
}

function isCompleteClient(
  client: AccountClient | null,
): client is AccountClient {
  return Boolean(client?.id?.trim() && client?.email?.trim());
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 12_000,
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const data = (await res.json().catch(() => ({}))) as T;
    return { res, data };
  } finally {
    window.clearTimeout(timer);
  }
}

export function AccountSessionProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<AccountClient | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const loadGeneration = useRef(0);

  const loadOrders = async (clientId: string, stored: AccountClient) => {
    const [
      { res: clientRes, data: clientData },
      { res: ordersRes, data: orderData },
    ] = await Promise.all([
      fetchJson<{ client?: AccountClient; error?: string }>(
        `/api/clients/${encodeURIComponent(clientId)}`,
        { credentials: "include" },
      ),
      fetchJson<{ orders?: AccountOrder[]; error?: string }>(
        "/api/client/orders",
        {
          headers: clientAuthHeaders(),
          credentials: "include",
        },
      ),
    ]);

    if (ordersRes.status === 401) {
      const restored = await restoreClientSessionFromCookie();
      if (restored.ok && restored.client.id === clientId) {
        const retry = await fetchJson<{ orders?: AccountOrder[] }>(
          "/api/client/orders",
          {
            headers: clientAuthHeaders(),
            credentials: "include",
          },
        );
        if (retry.res.ok) {
          return finalizeClientOrders(
            clientData?.client ?? stored,
            retry.data.orders ?? [],
          );
        }
      }
      throw new Error("Session expired. Please sign in again.");
    }

    if (!ordersRes.ok && ordersRes.status === 403) {
      throw new Error(
        (orderData as { error?: string }).error ??
          "Your account cannot access orders yet.",
      );
    }

    if (!clientRes.ok && clientRes.status === 404) {
      throw new Error("Account not found.");
    }

    return finalizeClientOrders(
      clientData?.client ?? stored,
      orderData.orders ?? [],
    );
  };

  const finalizeClientOrders = (
    raw: AccountClient,
    nextOrders: AccountOrder[],
  ) => {
    const normalized: AccountClient = {
      ...raw,
      avatarUrl: stripAvatarCacheQuery(raw?.avatarUrl),
    };
    persistAccountClient(normalized);
    setClient(normalized);
    setOrders(sortOrdersNewestFirst(nextOrders));
    return normalized;
  };

  const refreshOrders = async () => {
    const current = readClient();
    const token = clientAuthToken();
    if (!isCompleteClient(current) || !token) return;
    try {
      await loadOrders(current.id, current);
    } catch {
      /* ignore background refresh errors */
    }
  };

  useEffect(() => {
    const generation = ++loadGeneration.current;

    void (async () => {
      try {
        let stored = readClient();
        let token = clientAuthToken();

        const restored = await restoreClientSessionFromCookie();
        if (generation !== loadGeneration.current) return;

        if (restored.ok) {
          stored = restored.client as AccountClient;
          token = restored.token;
        } else if (!isCompleteClient(stored) || !token) {
          setClient(null);
          setOrders([]);
          logoutClientSession("/login");
          return;
        }

        if (!isCompleteClient(stored) || !token) {
          setClient(null);
          setOrders([]);
          logoutClientSession("/login");
          return;
        }

        const statusBlock = stored.status
          ? clientStatusAuthError(stored.status)
          : null;
        if (statusBlock) {
          setClient(null);
          setOrders([]);
          try {
            sessionStorage.setItem("sarjan-login-flash", statusBlock);
          } catch {
            /* ignore */
          }
          logoutClientSession("/login");
          return;
        }

        setClient(stored);
        await loadOrders(stored.id, stored);
      } catch (error) {
        if (generation !== loadGeneration.current) return;
        setClient(null);
        setOrders([]);
        try {
          sessionStorage.setItem(
            "sarjan-login-flash",
            error instanceof Error ? error.message : "Could not load account.",
          );
        } catch {
          /* ignore */
        }
        logoutClientSession("/login");
      } finally {
        if (generation === loadGeneration.current) {
          setLoading(false);
        }
      }
    })();
  }, []);

  const value = useMemo(
    () => ({ client, orders, loading, setClient, refreshOrders }),
    [client, orders, loading],
  );

  return (
    <AccountSessionContext.Provider value={value}>
      {children}
    </AccountSessionContext.Provider>
  );
}

export function useAccountSession() {
  const value = useContext(AccountSessionContext);
  if (!value) {
    throw new Error(
      "useAccountSession must be used within AccountSessionProvider",
    );
  }
  return value;
}
