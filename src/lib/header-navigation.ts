import type { CmsSiteSettings } from "@/lib/cms-store";
import { navigation as legacyNavigation } from "@/data/mock";

export type HeaderNavItem = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  /** After this item, show the Categories mega-menu (only when href is /products). */
  showCategoriesDropdown?: boolean;
};

export const HEADER_NAV_PAGE_OPTIONS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Categories (all)", href: "/categories" },
  { label: "Collections", href: "/collections" },
  { label: "Process", href: "/process" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQs", href: "/faqs" },
  { label: "Inquiry", href: "/inquiry" },
  { label: "Certifications", href: "/certifications" },
  { label: "Infrastructure", href: "/infrastructure" },
  { label: "Login", href: "/login" },
  { label: "Register", href: "/register" },
  { label: "Cart", href: "/cart" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Checkout", href: "/checkout" },
  { label: "Order tracking", href: "/order-tracking" },
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Terms of use", href: "/term-of-use" },
  { label: "Shipping policy", href: "/shipping-policy" },
  { label: "Refund policy", href: "/refund-policy" },
  { label: "Site map", href: "/site-map" },
];

export const defaultHeaderNavigation: HeaderNavItem[] = [
  { id: "home", label: "Home", href: "/", visible: true },
  {
    id: "products",
    label: "Products",
    href: "/products",
    visible: true,
    showCategoriesDropdown: true,
  },
  {
    id: "collections",
    label: "Collections",
    href: "/collections",
    visible: true,
  },
  { id: "process", label: "Process", href: "/process", visible: true },
  { id: "blog", label: "Blog", href: "/blog", visible: true },
  { id: "about", label: "About", href: "/about", visible: true },
  { id: "contact", label: "Contact", href: "/contact", visible: true },
];

function slugId(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function normalizeHeaderNavHref(href: string) {
  const trimmed = href.trim();
  if (!trimmed) return "/";
  if (trimmed.startsWith("/")) return trimmed.split("?")[0] || "/";
  return `/${trimmed.split("?")[0]}`;
}

export function normalizeHeaderNavigation(
  raw: unknown,
  fallback: HeaderNavItem[] = defaultHeaderNavigation,
): HeaderNavItem[] {
  if (!Array.isArray(raw) || !raw.length)
    return fallback.map((item) => ({ ...item }));

  const out: HeaderNavItem[] = [];
  const seenIds = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<HeaderNavItem>;
    const label = String(row.label ?? "").trim();
    const href = normalizeHeaderNavHref(String(row.href ?? "/"));
    if (!label) continue;

    let id = String(row.id ?? "").trim() || slugId(label);
    while (seenIds.has(id)) id = `${id}-${out.length}`;
    seenIds.add(id);

    out.push({
      id,
      label,
      href,
      visible: row.visible !== false,
      showCategoriesDropdown:
        row.showCategoriesDropdown === true && href === "/products",
    });
  }

  return out.length ? out : fallback.map((item) => ({ ...item }));
}

export function resolveHeaderNavigation(
  settings?: Partial<Pick<CmsSiteSettings, "headerNavigation">> | null,
): HeaderNavItem[] {
  const normalized = normalizeHeaderNavigation(
    settings?.headerNavigation,
    defaultHeaderNavigation,
  );
  return normalized.filter((item) => item.visible);
}

/** Visible items for storefront header (label + href). */
export function resolveHeaderNavLinks(
  settings?: Partial<Pick<CmsSiteSettings, "headerNavigation">> | null,
) {
  return resolveHeaderNavigation(settings).map(
    ({ label, href, showCategoriesDropdown }) => ({
      label,
      href,
      showCategoriesDropdown: Boolean(showCategoriesDropdown),
    }),
  );
}

function newNavId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `nav-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newHeaderNavItem(
  partial: Partial<HeaderNavItem> = {},
): HeaderNavItem {
  const label = partial.label?.trim() || "New link";
  return {
    id: partial.id?.trim() || slugId(`${label}-${newNavId().slice(0, 8)}`),
    label,
    href: normalizeHeaderNavHref(partial.href ?? "/"),
    visible: partial.visible !== false,
    showCategoriesDropdown: partial.showCategoriesDropdown === true,
  };
}

/** Legacy static nav when CMS has no custom menu. */
export function legacyHeaderNavLinks() {
  return legacyNavigation.map((item) => ({
    label: item.label,
    href: item.href,
    showCategoriesDropdown: item.href === "/products",
  }));
}
