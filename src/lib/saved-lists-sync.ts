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

/** Stamp local edits immediately so server pull cannot win over a fresh remove. */
export function touchLocalSavedListsUpdatedAt(iso = new Date().toISOString()) {
  writeLocalSavedListsUpdatedAt(iso);
}

function normalizeSavedListsPayload(
  payload: SavedListsPayload,
): SavedListsPayload {
  return {
    wishlist: Array.from(new Set(payload.wishlist.filter(Boolean))).sort(),
    compare: Array.from(new Set(payload.compare.filter(Boolean)))
      .slice(0, 3)
      .sort(),
  };
}

function savedListsEqual(a: SavedListsPayload, b: SavedListsPayload) {
  return (
    JSON.stringify(normalizeSavedListsPayload(a)) ===
    JSON.stringify(normalizeSavedListsPayload(b))
  );
}

function isEmptySavedLists(value: SavedListsPayload) {
  return value.wishlist.length === 0 && value.compare.length === 0;
}

let pullInFlight: Promise<void> | null = null;
let pushInFlight: Promise<void> | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let sessionPullDone = false;
let lastPushedPayload: SavedListsPayload | null = null;
let authSyncTimer: ReturnType<typeof setTimeout> | null = null;

function notifySavedListsSynced() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sarjan-saved-lists-synced"));
}

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

  const normalized = normalizeSavedListsPayload(payload);
  if (lastPushedPayload && savedListsEqual(lastPushedPayload, normalized)) {
    return { ok: true, updatedAt: readLocalSavedListsUpdatedAt() };
  }

  try {
    const res = await fetch("/api/client/saved-lists", {
      method: "POST",
      headers: clientAuthJsonHeaders(),
      credentials: "include",
      body: JSON.stringify(normalized),
    });
    if (!res.ok) return { ok: false, updatedAt: null };
    const data = (await res.json()) as { updatedAt?: string };
    lastPushedPayload = normalized;
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

export function scheduleSavedListsAuthSync() {
  if (typeof window === "undefined") return;
  if (authSyncTimer) clearTimeout(authSyncTimer);
  authSyncTimer = setTimeout(() => {
    authSyncTimer = null;
    resetSavedListsSession();
    void pullSavedListsFromServer({ force: true });
  }, 300);
}

export async function pullSavedListsFromServer(options?: { force?: boolean }) {
  if (sessionPullDone && !options?.force) return;
  if (pullInFlight) return pullInFlight;

  pullInFlight = (async () => {
    const clientId = readStoredClientId();
    if (!clientId || !isClientApproved()) return;
    sessionPullDone = true;

    const before: SavedListsPayload = normalizeSavedListsPayload({
      wishlist: readWishlist(),
      compare: readCompare(),
    });
    const serverRaw = await fetchServerSavedLists();
    const server = normalizeSavedListsPayload({
      wishlist: serverRaw.wishlist,
      compare: serverRaw.compare,
    });
    const resolved = resolveSyncedSnapshot(
      before,
      server,
      readLocalSavedListsUpdatedAt(),
      serverRaw.updatedAt,
      isEmptySavedLists,
    );

    let adoptedAt = resolved.adoptUpdatedAt;
    if (resolved.pushLocal) {
      const saved = await persistSavedListsToServer(resolved.items);
      if (saved.ok && saved.updatedAt) {
        adoptedAt = saved.updatedAt;
      }
    }

    writeWishlist(resolved.items.wishlist, {
      syncApi: false,
      touchUpdatedAt: false,
    });
    writeCompare(resolved.items.compare, {
      syncApi: false,
      touchUpdatedAt: false,
    });
    if (adoptedAt) {
      writeLocalSavedListsUpdatedAt(adoptedAt);
    }

    const after: SavedListsPayload = normalizeSavedListsPayload({
      wishlist: readWishlist(),
      compare: readCompare(),
    });
    if (!savedListsEqual(before, after)) {
      notifySavedListsSynced();
    }
  })().finally(() => {
    pullInFlight = null;
  });

  return pullInFlight;
}

export async function pushSavedListsToServer() {
  if (typeof window === "undefined") return;
  const clientId = readStoredClientId();
  if (!clientId || !isClientApproved()) return;
  if (pushInFlight) return pushInFlight;

  pushInFlight = (async () => {
    const payload = normalizeSavedListsPayload({
      wishlist: readWishlist(),
      compare: readCompare(),
    });
    if (lastPushedPayload && savedListsEqual(lastPushedPayload, payload)) {
      return;
    }
    const saved = await persistSavedListsToServer(payload);
    if (saved.ok && saved.updatedAt) {
      writeLocalSavedListsUpdatedAt(saved.updatedAt);
    }
  })().finally(() => {
    pushInFlight = null;
  });

  return pushInFlight;
}
