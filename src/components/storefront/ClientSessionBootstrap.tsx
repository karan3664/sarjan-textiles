"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isClientPublicAuthPage } from "@/lib/auth-route-guards";
import {
  clearClientSessionLocal,
  clientAuthToken,
  validateAndRefreshClientSession,
} from "@/lib/client-auth-browser";

/** Keeps header/checkout/cart in sync with a valid server session. */
export function ClientSessionBootstrap() {
  const pathname = usePathname();
  const validating = useRef(false);

  useEffect(() => {
    if (isClientPublicAuthPage(pathname)) {
      clearClientSessionLocal();
      return;
    }

    const run = async () => {
      if (validating.current) return;
      validating.current = true;
      try {
        await validateAndRefreshClientSession();
      } finally {
        validating.current = false;
      }
    };

    void run();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!clientAuthToken()) return;
      void run();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pathname]);

  return null;
}
