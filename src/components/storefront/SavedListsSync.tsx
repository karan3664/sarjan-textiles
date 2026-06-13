"use client";

import { useEffect } from "react";
import {
  isClientApproved,
  readStoredClientId,
} from "@/lib/client-auth-browser";
import {
  pullSavedListsFromServer,
  scheduleSavedListsAuthSync,
} from "@/lib/saved-lists-sync";

/** Keeps wishlist/compare aligned with the logged-in client's server copy. */
export function SavedListsSync() {
  useEffect(() => {
    const pull = () => {
      if (!readStoredClientId() || !isClientApproved()) return;
      void pullSavedListsFromServer();
    };

    pull();
    const onAuth = () => scheduleSavedListsAuthSync();
    window.addEventListener("sarjan-auth-updated", onAuth);
    return () => window.removeEventListener("sarjan-auth-updated", onAuth);
  }, []);

  return null;
}
