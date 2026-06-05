"use client";

import { useEffect } from "react";
import { pullSavedListsFromServer } from "@/lib/saved-lists-sync";

/** Merges wishlist/compare with the logged-in client's server copy. */
export function SavedListsSync() {
  useEffect(() => {
    void pullSavedListsFromServer();
    const onStorage = () => void pullSavedListsFromServer();
    window.addEventListener("sarjan-auth-updated", onStorage);
    return () => window.removeEventListener("sarjan-auth-updated", onStorage);
  }, []);

  return null;
}
