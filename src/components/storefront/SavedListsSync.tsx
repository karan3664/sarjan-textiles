"use client";

import { useEffect } from "react";
import { pullSavedListsFromServer } from "@/lib/saved-lists-sync";

/** Keeps wishlist/compare aligned with the logged-in client's server copy. */
export function SavedListsSync() {
  useEffect(() => {
    void pullSavedListsFromServer();
    const onRefresh = () => void pullSavedListsFromServer();
    window.addEventListener("sarjan-auth-updated", onRefresh);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        void pullSavedListsFromServer();
      }
    });
    return () => window.removeEventListener("sarjan-auth-updated", onRefresh);
  }, []);

  return null;
}
