"use client";

import { useEffect } from "react";

function isMobileAdmin() {
  return window.matchMedia("(max-width: 1200px)").matches;
}

export function AdminSidebarController() {
  useEffect(() => {
    const layout = () => document.querySelector<HTMLElement>(".layout-wrap");
    const cleanupDuplicateMenuItems = () => {
      document
        .querySelectorAll<HTMLElement>(".section-menu-left")
        .forEach((sidebar) => {
          const seen = new Set<string>();
          sidebar
            .querySelectorAll<HTMLLIElement>(".menu-item")
            .forEach((item) => {
              const link = item.querySelector<HTMLAnchorElement>("a");
              const key = `${link?.getAttribute("href") ?? ""}|${item.textContent?.trim() ?? ""}`;
              if (seen.has(key)) item.remove();
              else seen.add(key);
            });
        });
    };

    const closeMobileMenu = () => {
      if (isMobileAdmin()) layout()?.classList.remove("full-width");
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const toggle = target.closest<HTMLElement>("[data-admin-menu-toggle]");
      const close = target.closest<HTMLElement>("[data-admin-menu-close]");
      const backdrop = target.closest<HTMLElement>(
        ".section-menu-left .menu-backdrop",
      );

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

    cleanupDuplicateMenuItems();
    const observer = new MutationObserver(cleanupDuplicateMenuItems);
    document
      .querySelectorAll(".section-menu-left")
      .forEach((node) =>
        observer.observe(node, { childList: true, subtree: true }),
      );

    document.addEventListener("click", onClick, true);
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
