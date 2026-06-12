"use client";

import { useEffect } from "react";
import {
  isClientApproved,
  readStoredClientId,
} from "@/lib/client-auth-browser";
import {
  pullSavedListsFromServer,
  resetSavedListsSession,
} from "@/lib/saved-lists-sync";

/** Keeps wishlist/compare aligned with the logged-in client's server copy. */
export function SavedListsSync() {
  useEffect(() => {
    const pull = (force = false) => {
      if (!readStoredClientId() || !isClientApproved()) return;
      void pullSavedListsFromServer(force ? { force: true } : undefined);
    };

    pull();
    const onAuth = () => {
      resetSavedListsSession();
      pull(true);
    };
    window.addEventListener("sarjan-auth-updated", onAuth);
    return () => window.removeEventListener("sarjan-auth-updated", onAuth);
  }, []);

  return null;
}
