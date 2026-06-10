"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { shouldShowStorefrontMobileChrome } from "@/lib/storefront-nav-active";

const SCROLL_THRESHOLD = 6;
const TOP_REVEAL_Y = 4;

export function useStorefrontScrollChrome() {
  const pathname = usePathname();
  const enabled = shouldShowStorefrontMobileChrome(pathname);
  const lastY = useRef(0);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setChromeHidden(false);
      setElevated(false);
      return;
    }

    lastY.current = window.scrollY;
    setChromeHidden(false);
    setElevated(window.scrollY > 8);
  }, [pathname, enabled]);

  useEffect(() => {
    if (!enabled) return;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;

        setElevated(y > 8);

        if (y <= TOP_REVEAL_Y) {
          setChromeHidden(false);
        } else if (dy > SCROLL_THRESHOLD) {
          setChromeHidden(true);
        } else if (dy < -SCROLL_THRESHOLD) {
          setChromeHidden(false);
        }

        lastY.current = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  return { enabled, chromeHidden, elevated };
}
