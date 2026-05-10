"use client";

import { useEffect } from "react";

function isMobileAdmin() {
  return window.matchMedia("(max-width: 1199px)").matches;
}

export function AdminSidebarController() {
  useEffect(() => {
    const layout = () => document.querySelector<HTMLElement>(".layout-wrap");

    const closeMobileMenu = () => {
      if (isMobileAdmin()) layout()?.classList.remove("full-width");
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const toggle = target.closest<HTMLElement>("[data-admin-menu-toggle]");
      const close = target.closest<HTMLElement>("[data-admin-menu-close]");
      const backdrop = target.closest<HTMLElement>(".section-menu-left .menu-backdrop");

      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        layout()?.classList.toggle("full-width");
        return;
      }

      if (close) {
        event.preventDefault();
        event.stopPropagation();
        const node = layout();
        if (!node) return;
        if (isMobileAdmin()) node.classList.remove("full-width");
        else node.classList.add("full-width");
        return;
      }

      if (backdrop) {
        event.preventDefault();
        event.stopPropagation();
        closeMobileMenu();
      }
    };

    const onResize = () => {
      if (!isMobileAdmin()) return;
      layout()?.classList.remove("full-width");
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
