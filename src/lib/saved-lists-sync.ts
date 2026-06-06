"use client";

import {
  clientAuthJsonHeaders,
  isClientApproved,
  readStoredClientId,
} from "@/lib/client-auth-browser";
import { resolveSyncedSnapshot } from "@/lib/client-sync-timestamp";
import { readCompare, writeCompare } from "@/lib/compare-client";
import { readWishlist, writeWishlist } from "@/lib/wishlist-client";

export const SAVED_LISTS_UPDATED_AT_KEY = "sarjan-saved-lists-updated-at";

type SavedListsPayload = {
  wishlist: string[];
  compare: string[];
};

function readLocalSavedListsUpdatedAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SAVED_LISTS_UPDATED_AT_KEY);
}

function writeLocalSavedListsUpdatedAt(iso: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_LISTS_UPDATED_AT_KEY, iso);
}

function isEmptySavedLists(value: SavedListsPayload) {
  return value.wishlist.length === 0 && value.compare.length === 0;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pullInFlight: Promise<void> | null = null;
let sessionPullDone = false;

async function fetchServerSavedLists(): Promise<{
  wishlist: string[];
  compare: string[];
  updatedAt: string | null;
}> {
  try {
    const res = await fetch("/api/client/saved-lists", {
      headers: clientAuthJsonHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      return { wishlist: [], compare: [], updatedAt: null };
    }
    const data = (await res.json()) as {
      wishlist?: string[];
      compare?: string[];
      updatedAt?: string;
    };
    return {
      wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
      compare: Array.isArray(data.compare) ? data.compare.slice(0, 3) : [],
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    };
  } catch {
    return { wishlist: [], compare: [], updatedAt: null };
  }
}

async function persistSavedListsToServer(
  payload: SavedListsPayload,
): Promise<{ ok: boolean; updatedAt: string | null }> {
  const clientId = readStoredClientId();
  if (!clientId) return { ok: false, updatedAt: null };

  try {
    const res = await fetch("/api/client/saved-lists", {
      method: "POST",
      headers: clientAuthJsonHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, updatedAt: null };
    const data = (await res.json()) as { updatedAt?: string };
    return {
      ok: true,
      updatedAt:
        typeof data.updatedAt === "string"
          ? data.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return { ok: false, updatedAt: null };
  }
}

export function scheduleSavedListsSync() {
  if (typeof window === "undefined") return;
  if (!readStoredClientId() || !isClientApproved()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void pushSavedListsToServer();
  }, 600);
}

export function resetSavedListsSession() {
  sessionPullDone = false;
}

export async function pullSavedListsFromServer(options?: { force?: boolean }) {
  if (sessionPullDone && !options?.force) return;
  if (pullInFlight) return pullInFlight;

  pullInFlight = (async () => {
    sessionPullDone = true;
    const clientId = readStoredClientId();
    if (!clientId || !isClientApproved()) return;

    const local: SavedListsPayload = {
      wishlist: readWishlist(),
      compare: readCompare(),
    };
    const server = await fetchServerSavedLists();
    const resolved = resolveSyncedSnapshot(
      local,
      { wishlist: server.wishlist, compare: server.compare },
      readLocalSavedListsUpdatedAt(),
      server.updatedAt,
      isEmptySavedLists,
    );

    let adoptedAt = resolved.adoptUpdatedAt;
    if (resolved.pushLocal) {
      const saved = await persistSavedListsToServer(resolved.items);
      if (saved.ok && saved.updatedAt) {
        adoptedAt = saved.updatedAt;
      }
    }

    writeWishlist(resolved.items.wishlist, { syncApi: false });
    writeCompare(resolved.items.compare, { syncApi: false });
    if (adoptedAt) {
      writeLocalSavedListsUpdatedAt(adoptedAt);
    }
  })().finally(() => {
    pullInFlight = null;
  });

  return pullInFlight;
}

export async function pushSavedListsToServer() {
  const clientId = readStoredClientId();
  if (!clientId || !isClientApproved()) return;

  const payload: SavedListsPayload = {
    wishlist: readWishlist(),
    compare: readCompare(),
  };
  const saved = await persistSavedListsToServer(payload);
  if (saved.ok && saved.updatedAt) {
    writeLocalSavedListsUpdatedAt(saved.updatedAt);
  }
}
