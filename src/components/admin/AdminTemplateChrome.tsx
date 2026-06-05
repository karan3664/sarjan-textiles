import Link from "next/link";
import type { ReactNode } from "react";

import { OrderedVendorScripts } from "@/components/shared/OrderedVendorScripts";
import { AdminDashboardHeader } from "./AdminDashboardHeader";
import { AdminSidebarController } from "./AdminSidebarController";
import { AdminGlobalLoader } from "./AdminGlobalLoader";

const adminStyles = [
  "css/animate.min.css",
  "css/animation.css",
  "css/bootstrap.css",
  "css/bootstrap-select.min.css",
  "css/swiper-bundle.min.css",
  "css/styles.css",
  "font/fonts.css",
  "icon/icomoon/style.css",
];

const adminScripts = [
  "jquery.min.js",
  "countto.js",
  "bootstrap.min.js",
  "bootstrap-select.min.js",
  "lazysize.min.js",
  "swiper-bundle.min.js",
  "carousel.js",
  "theme-settings.js",
  "main.js",
];

function MenuItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <li className="menu-item">
      <Link
        href={href}
        className={`menu-item-button${active ? " active" : ""}`}
      >
        <div className="icon">
          <i className={icon} />
        </div>
        <div className="text text-title">{label}</div>
      </Link>
    </li>
  );
}

type AdminActiveSection =
  | "dashboard"
  | "customers"
  | "orders"
  | "dispatch"
  | "payments"
  | "inventory"
  | "pricing"
  | "home"
  | "headerMenu"
  | "testimonials"
  | "products"
  | "studio"
  | "filters"
  | "blogs"
  | "about"
  | "contact"
  | "inquiries"
  | "seo"
  | "audit"
  | "reports"
  | "roles"
  | "backups"
  | "categoryPages"
  | "collectionPages"
  | "customPages"
  | "commerceHub"
  | "blogComments"
  | "newsletter"
  | "sendNotifications"
  | "mobileApp"
  | "account";

type SidebarNavItem = {
  href: string;
  icon: string;
  label: string;
  /** Which `active` section highlights this row; omit for links that never show as current (e.g. storefront). */
  section?: AdminActiveSection;
};

/** Daily operations — top of sidebar */
const SIDEBAR_PRIORITY_ITEMS: SidebarNavItem[] = [
  {
    href: "/admin",
    icon: "icon-house",
    label: "Dashboard",
    section: "dashboard",
  },
  {
    href: "/admin/orders",
    icon: "icon-dollar",
    label: "Orders",
    section: "orders",
  },
  {
    href: "/admin/customers",
    icon: "icon-users",
    label: "Client Management",
    section: "customers",
  },
  {
    href: "/admin/dispatch",
    icon: "icon-send",
    label: "Dispatch",
    section: "dispatch",
  },
  {
    href: "/admin/payments",
    icon: "icon-hand-coins",
    label: "Payments & Credit",
    section: "payments",
  },
  {
    href: "/admin/products-low",
    icon: "icon-basket",
    label: "Inventory",
    section: "inventory",
  },
  {
    href: "/admin/products-list",
    icon: "icon-package",
    label: "Products",
    section: "products",
  },
  {
    href: "/admin/pricing",
    icon: "icon-dollar",
    label: "Client Pricing",
    section: "pricing",
  },
  {
    href: "/admin/reports",
    icon: "icon-chart-bar",
    label: "Reports",
    section: "reports",
  },
  {
    href: "/admin/contact-inquiries",
    icon: "icon-message",
    label: "Order Feedback",
    section: "inquiries",
  },
  {
    href: "/admin/commerce-hub",
    icon: "icon-chart-bar",
    label: "Commerce hub",
    section: "commerceHub",
  },
];

/** Website, CMS, marketing — below operations */
const SIDEBAR_SECONDARY_ITEMS: SidebarNavItem[] = [
  {
    href: "/admin/home",
    icon: "icon-edit",
    label: "CMS / Home Page",
    section: "home",
  },
  {
    href: "/admin/header-menu",
    icon: "icon-more-horizontal",
    label: "Header menu",
    section: "headerMenu",
  },
  {
    href: "/admin/about",
    icon: "icon-edit",
    label: "About Us",
    section: "about",
  },
  {
    href: "/admin/contact",
    icon: "icon-edit",
    label: "Contact Us",
    section: "contact",
  },
  {
    href: "/admin/blogs-list",
    icon: "icon-edit",
    label: "Blogs",
    section: "blogs",
  },
  {
    href: "/admin/blog-comments",
    icon: "icon-message",
    label: "Blog comments",
    section: "blogComments",
  },
  {
    href: "/admin/testimonials",
    icon: "icon-message",
    label: "Testimonials",
    section: "testimonials",
  },
  {
    href: "/admin/newsletter",
    icon: "icon-send",
    label: "Newsletter",
    section: "newsletter",
  },
  {
    href: "/admin/send-notifications",
    icon: "icon-bell",
    label: "App notifications",
    section: "sendNotifications",
  },
  {
    href: "/admin/mobile",
    icon: "icon-smartphone",
    label: "Mobile app CMS",
    section: "mobileApp",
  },
  {
    href: "/admin/category-pages",
    icon: "icon-chart-bar",
    label: "Category pages",
    section: "categoryPages",
  },
  {
    href: "/admin/collection-pages",
    icon: "icon-chart-bar",
    label: "Collection pages",
    section: "collectionPages",
  },
  {
    href: "/admin/custom-pages",
    icon: "icon-edit",
    label: "Custom site pages",
    section: "customPages",
  },
  {
    href: "/admin/product-filters",
    icon: "icon-chart-bar",
    label: "Product Filters",
    section: "filters",
  },
  {
    href: "/admin/ai-product-studio",
    icon: "icon-camera",
    label: "AI Product Studio",
    section: "studio",
  },
  {
    href: "/admin/seo",
    icon: "icon-chart-bar",
    label: "SEO",
    section: "seo",
  },
];

/** Account, access, maintenance — bottom */
const SIDEBAR_SYSTEM_ITEMS: SidebarNavItem[] = [
  {
    href: "/admin/account",
    icon: "icon-user-circle",
    label: "Account & security",
    section: "account",
  },
  {
    href: "/admin/roles",
    icon: "icon-users",
    label: "Roles & Permissions",
    section: "roles",
  },
  {
    href: "/admin/backups",
    icon: "icon-archive",
    label: "DB Backup / Restore",
    section: "backups",
  },
  {
    href: "/admin/audit",
    icon: "icon-clipboard-text",
    label: "Audit Logs",
    section: "audit",
  },
  { href: "/", icon: "icon-sign-out", label: "Front Store" },
];

type SidebarNavDivider = { type: "divider"; label: string };

type SidebarNavEntry = SidebarNavItem | SidebarNavDivider;

const SIDEBAR_NAV_ENTRIES: SidebarNavEntry[] = [
  ...SIDEBAR_PRIORITY_ITEMS,
  { type: "divider", label: "Website & CMS" },
  ...SIDEBAR_SECONDARY_ITEMS,
  { type: "divider", label: "System" },
  ...SIDEBAR_SYSTEM_ITEMS,
];

function isSidebarDivider(entry: SidebarNavEntry): entry is SidebarNavDivider {
  return "type" in entry && entry.type === "divider";
}

function SidebarNavDividerRow({ label }: { label: string }) {
  return (
    <li className="menu-item sarjan-admin-menu-divider">
      <span className="sarjan-admin-menu-divider__label">{label}</span>
    </li>
  );
}

function Sidebar({ active }: { active: AdminActiveSection }) {
  return (
    <div className="section-menu-left">
      <div className="menu-backdrop" />
      <div className="box-logo">
        <Link
          href="/admin"
          id="site-logo-inner"
          className="sarjan-admin-sidebar-logo"
        >
          <img
            id="logo_header"
            alt="Sarjan Textiles"
            src="/sarjan-assets/sarjan-logo-icon.png"
            data-light="/sarjan-assets/sarjan-logo-icon.png"
            data-dark="/sarjan-assets/sarjan-logo-icon.png"
          />
          <span>Sarjan Textiles</span>
        </Link>
        <button
          type="button"
          className="sarjan-admin-toggle sarjan-admin-toggle-close"
          data-admin-menu-close
          aria-label="Hide sidebar"
        >
          <i className="icon-chevron-left" />
        </button>
      </div>
      <div className="section-menu-left-wrap">
        <div className="center">
          <ul>
            {SIDEBAR_NAV_ENTRIES.map((entry, index) =>
              isSidebarDivider(entry) ? (
                <SidebarNavDividerRow
                  key={`divider-${entry.label}-${index}`}
                  label={entry.label}
                />
              ) : (
                <MenuItem
                  key={entry.href + entry.label}
                  href={entry.href}
                  icon={entry.icon}
                  label={entry.label}
                  active={entry.section != null && active === entry.section}
                />
              ),
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return <AdminDashboardHeader />;
}

export function AdminTemplateChrome({
  active,
  title,
  children,
}: {
  active: AdminActiveSection;
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      {adminStyles.map((style) => (
        <link key={style} rel="stylesheet" href={`/template/admin/${style}`} />
      ))}
      <link rel="stylesheet" href="/admin-charts.css" />
      <AdminGlobalLoader />
      <div id="wrapper">
        <div id="page">
          <div className="layout-wrap loader-off">
            <Sidebar active={active} />
            <AdminSidebarController />
            <div className="section-content-right">
              <Header />
              <div className="main-content">
                <div className="main-content-inner">
                  <div className="flex flex-wrap justify-between gap14 items-center">
                    <h4 className="heading">{title}</h4>
                    <div className="text-caption-1 text-secondary">
                      Sarjan Textiles CMS
                    </div>
                  </div>
                  {children}
                </div>
                <div className="bottom-page">
                  <div className="body-text">
                    Copyright © 2026 Sarjan Textiles.
                  </div>
                  <a
                    href="https://karandigitallabs.com"
                    target="_blank"
                    rel="noreferrer"
                    className="body-text sarjan-admin-footer-credit"
                  >
                    Designed & Developed by Karan Digital Labs
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <OrderedVendorScripts
        scope="admin"
        basePath="/template/admin/js"
        files={adminScripts}
      />
    </>
  );
}
