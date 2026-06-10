"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  activeStorefrontBottomNavId,
  shouldShowStorefrontMobileChrome,
  type StorefrontBottomNavId,
} from "@/lib/storefront-nav-active";
import {
  readStoredClientProfile,
  validateAndRefreshClientSession,
} from "@/lib/client-auth-browser";
import { isClientPublicAuthPage } from "@/lib/auth-route-guards";
import { showBootstrapModal } from "@/lib/bootstrap-modal";

function HomeNavIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19v-8.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        fill={active ? "currentColor" : "none"}
        strokeLinejoin="round"
      />
    </svg>
  );
}

type NavItem = {
  id: StorefrontBottomNavId;
  label: string;
  href?: string;
  icon?: string;
  iconActive?: string;
  renderIcon?: (active: boolean) => ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    renderIcon: (active) => <HomeNavIcon active={active} />,
  },
  {
    id: "categories",
    label: "Categories",
    href: "/categories",
    icon: "icon-categories",
    iconActive: "icon-categories",
  },
  {
    id: "search",
    label: "Search",
    icon: "icon-search2",
    iconActive: "icon-search2",
  },
  {
    id: "shop",
    label: "Shop",
    href: "/products",
    icon: "icon-ShoppingBagOpen",
    iconActive: "icon-ShoppingBagOpen",
  },
  {
    id: "account",
    label: "Account",
    href: "/login",
    icon: "icon-user",
    iconActive: "icon-user",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const visible = shouldShowStorefrontMobileChrome(pathname);
  const activeId = activeStorefrontBottomNavId(pathname);
  const [accountHref, setAccountHref] = useState("/login");

  useEffect(() => {
    const apply = () => {
      const stored = readStoredClientProfile();
      setAccountHref(stored ? "/profile" : "/login");
    };

    if (isClientPublicAuthPage(pathname)) {
      setAccountHref("/login");
      return;
    }

    void validateAndRefreshClientSession().finally(apply);
    window.addEventListener("sarjan-auth-updated", apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener("sarjan-auth-updated", apply);
      window.removeEventListener("storage", apply);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <nav
      className="sarjan-mobile-bottom-nav d-xl-none"
      aria-label="Primary mobile"
    >
      <div className="sarjan-mobile-bottom-nav__inner">
        {NAV_ITEMS.map((item) => {
          const active = activeId === item.id;
          const href = item.id === "account" ? accountHref : item.href;

          const content = (
            <>
              <span className="sarjan-mobile-bottom-nav__icon-wrap">
                {active ? (
                  <span
                    className="sarjan-mobile-bottom-nav__active-pill"
                    aria-hidden
                  />
                ) : null}
                {item.renderIcon ? (
                  item.renderIcon(active)
                ) : (
                  <span
                    className={`icon ${active ? item.iconActive : item.icon}`}
                    aria-hidden
                  />
                )}
              </span>
              <span className="sarjan-mobile-bottom-nav__label">
                {item.label}
              </span>
            </>
          );

          if (item.id === "search") {
            return (
              <button
                key={item.id}
                type="button"
                className={`sarjan-mobile-bottom-nav__item${active ? " is-active" : ""}`}
                aria-label="Search products"
                aria-current={active ? "page" : undefined}
                onClick={() => showBootstrapModal("search")}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={href ?? "/"}
              className={`sarjan-mobile-bottom-nav__item${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
