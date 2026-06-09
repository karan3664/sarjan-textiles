import type { CmsSiteSettings } from "@/lib/cms-store";
import { HEADER_NAV_PAGE_OPTIONS } from "@/lib/header-navigation";

export type AccountNavPlacement = "header" | "sidebar" | "both";

export type AccountNavItem = {
  id: string;
  label: string;
  href: string;
  icon?: string;
  visible: boolean;
  /** Shown only when client session exists. */
  requiresAuth?: boolean;
  /** Shown only when guest (not signed in). */
  guestOnly?: boolean;
  /** Where this link appears on the storefront. */
  placement: AccountNavPlacement;
};

export const ACCOUNT_NAV_PAGE_OPTIONS: { label: string; href: string }[] = [
  ...HEADER_NAV_PAGE_OPTIONS,
  { label: "My account (dashboard)", href: "/my-account" },
  { label: "Profile", href: "/profile" },
  { label: "My orders", href: "/my-account-orders" },
  { label: "Saved address", href: "/my-account-address" },
  { label: "Share testimonial", href: "/my-account-testimonials" },
];

export const defaultAccountNavigation: AccountNavItem[] = [
  {
    id: "header-account",
    label: "My Account",
    href: "/profile",
    icon: "icon-user",
    visible: true,
    requiresAuth: true,
    placement: "header",
  },
  {
    id: "header-orders",
    label: "My Orders",
    href: "/my-account-orders",
    icon: "icon-ShoppingBagOpen",
    visible: true,
    requiresAuth: true,
    placement: "header",
  },
  {
    id: "header-testimonial",
    label: "Share Testimonial",
    href: "/my-account-testimonials",
    icon: "icon-star",
    visible: true,
    requiresAuth: true,
    placement: "header",
  },
  {
    id: "header-login",
    label: "Login",
    href: "/login",
    icon: "icon-user",
    visible: true,
    guestOnly: true,
    placement: "header",
  },
  {
    id: "header-contact-guest",
    label: "Contact us",
    href: "/contact",
    icon: "icon-mail",
    visible: true,
    guestOnly: true,
    placement: "header",
  },
  {
    id: "sidebar-dashboard",
    label: "Dashboard",
    href: "/my-account",
    icon: "icon-user",
    visible: true,
    requiresAuth: true,
    placement: "sidebar",
  },
  {
    id: "sidebar-orders",
    label: "Orders",
    href: "/my-account-orders",
    icon: "icon-ShoppingBagOpen",
    visible: true,
    requiresAuth: true,
    placement: "sidebar",
  },
  {
    id: "sidebar-address",
    label: "Address",
    href: "/my-account-address",
    icon: "icon-map-pin",
    visible: true,
    requiresAuth: true,
    placement: "sidebar",
  },
  {
    id: "sidebar-testimonial",
    label: "Share Testimonial",
    href: "/my-account-testimonials",
    icon: "icon-star",
    visible: true,
    requiresAuth: true,
    placement: "sidebar",
  },
  {
    id: "sidebar-tracking",
    label: "Order Tracking",
    href: "/order-tracking",
    icon: "icon-shipping",
    visible: true,
    requiresAuth: true,
    placement: "sidebar",
  },
];

function slugId(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function normalizeAccountNavHref(href: string) {
  const trimmed = href.trim();
  if (!trimmed) return "/";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) return trimmed.split("?")[0] || "/";
  return `/${trimmed.split("?")[0]}`;
}

export function normalizeAccountNavigation(
  raw: unknown,
  fallback: AccountNavItem[] = defaultAccountNavigation,
): AccountNavItem[] {
  if (!Array.isArray(raw) || !raw.length) {
    return fallback.map((item) => ({ ...item }));
  }

  const out: AccountNavItem[] = [];
  const seenIds = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<AccountNavItem>;
    const label = String(row.label ?? "").trim();
    const href = normalizeAccountNavHref(String(row.href ?? "/"));
    if (!label) continue;

    let id = String(row.id ?? "").trim() || slugId(label);
    while (seenIds.has(id)) id = `${id}-${out.length}`;
    seenIds.add(id);

    const placement =
      row.placement === "header" ||
      row.placement === "sidebar" ||
      row.placement === "both"
        ? row.placement
        : "both";

    out.push({
      id,
      label,
      href,
      icon: row.icon?.trim() || undefined,
      visible: row.visible !== false,
      requiresAuth: row.requiresAuth === true,
      guestOnly: row.guestOnly === true,
      placement,
    });
  }

  return out.length ? out : fallback.map((item) => ({ ...item }));
}

function matchesPlacement(
  item: AccountNavItem,
  placement: AccountNavPlacement,
) {
  return item.placement === placement || item.placement === "both";
}

export function resolveAccountNavigation(
  settings?: Partial<Pick<CmsSiteSettings, "accountNavigation">> | null,
  options?: {
    placement?: AccountNavPlacement;
    isAuthenticated?: boolean;
  },
): AccountNavItem[] {
  const normalized = normalizeAccountNavigation(settings?.accountNavigation);
  return normalized.filter((item) => {
    if (!item.visible) return false;
    if (options?.placement && !matchesPlacement(item, options.placement)) {
      return false;
    }
    if (item.requiresAuth && !options?.isAuthenticated) return false;
    if (item.guestOnly && options?.isAuthenticated) return false;
    return true;
  });
}

function newNavId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `acct-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newAccountNavItem(
  partial: Partial<AccountNavItem> = {},
): AccountNavItem {
  const label = partial.label?.trim() || "New link";
  return {
    id: partial.id?.trim() || slugId(`${label}-${newNavId().slice(0, 8)}`),
    label,
    href: normalizeAccountNavHref(partial.href ?? "/"),
    icon: partial.icon?.trim() || "icon-arrRight",
    visible: partial.visible !== false,
    requiresAuth: partial.requiresAuth === true,
    guestOnly: partial.guestOnly === true,
    placement: partial.placement ?? "both",
  };
}

/** Append a custom site page link to account navigation (admin helper). */
export function appendCustomPageToAccountNav(
  items: AccountNavItem[],
  slug: string,
  title: string,
): AccountNavItem[] {
  const href = `/${slug.replace(/^\/+/, "")}`;
  if (items.some((item) => item.href === href)) return items;
  return [
    ...items,
    newAccountNavItem({
      label: title,
      href,
      icon: "icon-arrRight",
      placement: "both",
    }),
  ];
}
