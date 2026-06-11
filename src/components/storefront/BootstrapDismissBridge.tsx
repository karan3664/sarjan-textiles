"use client";

import { useEffect } from "react";
import {
  hideBootstrapModal,
  hideBootstrapOffcanvas,
} from "@/lib/bootstrap-modal";

/** Reliable modal/offcanvas close when Bootstrap data-api or instances are missing. */
export function BootstrapDismissBridge() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const modalDismiss = target.closest<HTMLElement>(
        "[data-bs-dismiss='modal']",
      );
      if (modalDismiss) {
        const modal = modalDismiss.closest<HTMLElement>(".modal");
        if (modal?.id) {
          event.preventDefault();
          event.stopPropagation();
          hideBootstrapModal(modal.id);
        }
        return;
      }

      const offcanvasDismiss = target.closest<HTMLElement>(
        "[data-bs-dismiss='offcanvas']",
      );
      if (offcanvasDismiss) {
        const panel = offcanvasDismiss.closest<HTMLElement>(".offcanvas");
        if (!panel?.id) return;

        // Mobile menu links use data-bs-dismiss to close the drawer — still navigate.
        if (offcanvasDismiss instanceof HTMLAnchorElement) {
          const href = offcanvasDismiss.getAttribute("href")?.trim() ?? "";
          if (href && href !== "#") {
            hideBootstrapOffcanvas(panel.id);
            return;
          }
        }

        event.preventDefault();
        event.stopPropagation();
        hideBootstrapOffcanvas(panel.id);
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
