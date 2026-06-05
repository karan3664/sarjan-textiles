"use client";

import { readCompare, writeCompare } from "@/lib/compare-client";
import { readStoredClient } from "@/lib/client-session";
import { readWishlist, writeWishlist } from "@/lib/wishlist-client";

function clientAuthHeaders(): HeadersInit {
  const token =
    typeof document !== "undefined"
      ? document.cookie
          .split(";")
          .map((part) => part.trim())
          .find((part) => part.startsWith("sarjan-client-token="))
          ?.split("=")[1]
      : undefined;
  if (!token) return {};
  try {
    return { Authorization: `Bearer ${decodeURIComponent(token)}` };
  } catch {
    return { Authorization: `Bearer ${token}` };
  }
}

function mergeUnique(...lists: string[][]) {
  return Array.from(new Set(lists.flat().filter(Boolean)));
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSavedListsSync() {
  if (typeof window === "undefined") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void pushSavedListsToServer();
  }, 600);
}

export async function pullSavedListsFromServer() {
  const client = readStoredClient();
  if (!client?.id || client.status !== "approved") return;

  try {
    const res = await fetch("/api/client/saved-lists", {
      headers: clientAuthHeaders(),
      credentials: "include",
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      wishlist?: string[];
      compare?: string[];
    };
    const mergedWishlist = mergeUnique(readWishlist(), data.wishlist ?? []);
    const mergedCompare = mergeUnique(readCompare(), data.compare ?? []).slice(
      0,
      3,
    );
    writeWishlist(mergedWishlist);
    writeCompare(mergedCompare);
    await pushSavedListsToServer();
  } catch {
    /* offline — keep local lists */
  }
}

export async function pushSavedListsToServer() {
  const client = readStoredClient();
  if (!client?.id || client.status !== "approved") return;

  try {
    await fetch("/api/client/saved-lists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...clientAuthHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({
        wishlist: readWishlist(),
        compare: readCompare(),
      }),
    });
  } catch {
    /* ignore */
  }
}
