"use client";

import { useEffect } from "react";

const PRODUCTION_APEX = "https://sarjantextiles.com";

/**
 * Recover mobile browsers trapped on localhost after a bad middleware redirect
 * (internal Docker Host header). Runs once on production builds only.
 */
export function StorefrontOriginGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const { hostname, pathname, search, hash } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") return;

    const target = `${PRODUCTION_APEX}${pathname}${search}${hash}`;
    if (window.location.href === target) return;

    window.location.replace(target);
  }, []);

  return null;
}
