"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  registerStorefrontServiceWorker,
  shouldRegisterStorefrontServiceWorker,
} from "@/lib/storefront-pwa";

export function StorefrontPwaRegistration() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!shouldRegisterStorefrontServiceWorker(pathname)) return;

    let cancelled = false;

    registerStorefrontServiceWorker().catch((error) => {
      if (!cancelled) {
        console.warn("[sarjan-pwa] service worker registration failed", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
