"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const OFFCANVAS_IDS = ["mobileMenu", "mbAccount"] as const;
const HASH_IDS = new Set<string>(OFFCANVAS_IDS);

function closeOffcanvas(id: string) {
  const node = document.getElementById(id);
  if (!node) return;

  const bootstrap = (
    window as unknown as {
      bootstrap?: {
        Offcanvas?: {
          getInstance: (el: Element) => { hide: () => void } | null;
        };
      };
    }
  ).bootstrap;

  const instance = bootstrap?.Offcanvas?.getInstance(node);
  if (instance) {
    instance.hide();
    return;
  }

  node.classList.remove("show");
}

function clearOffcanvasSideEffects() {
  document.querySelectorAll(".offcanvas.show").forEach((node) => {
    node.classList.remove("show");
  });
  document.querySelectorAll(".offcanvas-backdrop").forEach((node) => {
    node.remove();
  });
  document.body.classList.remove("offcanvas-open", "modal-open");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
}

function stripOffcanvasHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!HASH_IDS.has(hash)) return;
  history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
}

/** Close Bootstrap offcanvas and remove #mobileMenu / #mbAccount from the URL on navigation. */
export function OffcanvasRouteGuard() {
  const pathname = usePathname();

  useEffect(() => {
    OFFCANVAS_IDS.forEach(closeOffcanvas);
    clearOffcanvasSideEffects();
    stripOffcanvasHash();
  }, [pathname]);

  return null;
}
