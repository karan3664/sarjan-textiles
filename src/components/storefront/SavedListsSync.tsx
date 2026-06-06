"use client";

import { useEffect } from "react";
import {
  pullSavedListsFromServer,
  resetSavedListsSession,
} from "@/lib/saved-lists-sync";

/** Keeps wishlist/compare aligned with the logged-in client's server copy. */
export function SavedListsSync() {
  useEffect(() => {
    void pullSavedListsFromServer();
    const onAuth = () => {
      resetSavedListsSession();
      void pullSavedListsFromServer({ force: true });
    };
    window.addEventListener("sarjan-auth-updated", onAuth);
    return () => window.removeEventListener("sarjan-auth-updated", onAuth);
  }, []);

  return null;
}
