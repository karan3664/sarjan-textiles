"use client";

import { useEffect, useState } from "react";

const LOGOUT_FLASH_KEY = "sarjan-logout-flash";

/** One-shot toast after voluntary client logout (set before redirect to /). */
export function StorefrontSessionFlash() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const flash = sessionStorage.getItem(LOGOUT_FLASH_KEY)?.trim();
    if (!flash) return undefined;
    sessionStorage.removeItem(LOGOUT_FLASH_KEY);
    setMessage(flash);
    const timer = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!message) return null;

  return (
    <div className="sarjan-session-flash" role="status" aria-live="polite">
      <p className="sarjan-session-flash__text mb_0">{message}</p>
    </div>
  );
}
