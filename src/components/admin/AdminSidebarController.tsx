"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SIDEBAR_SCROLL_KEY = "sarjan-admin-sidebar-scroll";

function isMobileAdmin() {
  return window.matchMedia("(max-width: 1200px)").matches;
}

function layout() {
  return document.querySelector<HTMLElement>(".layout-wrap");
}

function sidebarWrap() {
  return document.querySelector<HTMLElement>(
    ".section-menu-left .section-menu-left-wrap",
  );
}

function saveSidebarScroll() {
  const wrap = sidebarWrap();
  if (!wrap) return;
  sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(wrap.scrollTop));
}

function scrollActiveSidebarItemIntoView() {
  const wrap = sidebarWrap();
  if (!wrap) return;

  const active = wrap.querySelector<HTMLElement>(".menu-item-button.active");
  if (active) {
    active.scrollIntoView({ block: "nearest" });
    saveSidebarScroll();
    return;
  }

  const saved = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY) ?? "0");
  if (Number.isFinite(saved) && saved > 0) {
    wrap.scrollTop = saved;
  }
}

export function AdminSidebarController() {
  const pathname = usePathname();

  useEffect(() => {
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
      const menuLink = target.closest<HTMLElement>(
        ".section-menu-left .menu-item a",
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
        return;
      }

      if (menuLink) {
        saveSidebarScroll();
        if (isMobileAdmin()) closeMobileMenu();
      }
    };

    const onScroll = () => {
      saveSidebarScroll();
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

    const wrap = sidebarWrap();
    wrap?.addEventListener("scroll", onScroll, { passive: true });

    document.addEventListener("click", onClick, true);
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      wrap?.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(scrollActiveSidebarItemIntoView, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
