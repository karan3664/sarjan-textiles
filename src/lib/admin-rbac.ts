export type AdminRole =
  | "super_admin"
  | "admin"
  | "sales"
  | "dispatch"
  | "accounts"
  | "content";

export type AdminSession = {
  email: string;
  name: string;
  role: AdminRole;
  sv?: number;
  iat: number;
  exp: number;
};

export type ConfiguredAdmin = {
  email: string;
  password?: string;
  passwordHash?: string;
  name: string;
  role: AdminRole;
};

export const roleAccess: Record<AdminRole, string[]> = {
  super_admin: ["/admin", "/api/admin", "/admin/send-notifications"],
  admin: ["/admin", "/api/admin", "/admin/send-notifications"],
  sales: [
    "/admin",
    "/admin/account",
    "/admin/customers",
    "/admin/orders",
    "/admin/pricing",
    "/admin/reports",
    "/api/admin/account",
    "/api/admin/dashboard",
    "/api/admin/customers",
    "/api/admin/notifications",
    "/api/admin/orders",
    "/api/admin/pricing",
    "/api/admin/reports",
  ],
  dispatch: [
    "/admin",
    "/admin/account",
    "/admin/dispatch",
    "/admin/orders",
    "/admin/products-low",
    "/admin/reports",
    "/api/admin/account",
    "/api/admin/dashboard",
    "/api/admin/notifications",
    "/api/admin/orders",
    "/api/admin/inventory",
    "/api/admin/reports",
  ],
  accounts: [
    "/admin",
    "/admin/account",
    "/admin/payments",
    "/admin/reports",
    "/api/admin/account",
    "/api/admin/dashboard",
    "/api/admin/notifications",
    "/api/admin/orders",
    "/api/admin/reports",
  ],
  content: [
    "/admin",
    "/admin/home",
    "/admin/settings",
    "/admin/header-menu",
    "/admin/category-pages",
    "/admin/collection-pages",
    "/admin/custom-pages",
    "/admin/mobile",
    "/admin/mobile-branding",
    "/admin/promotions",
    "/admin/analytics",
    "/admin/bulk-images",
    "/admin/products-list",
    "/admin/products-create",
    "/admin/product-filters",
    "/admin/about",
    "/admin/contact",
    "/admin/blogs",
    "/admin/blogs-list",
    "/admin/blogs-create",
    "/admin/testimonials",
    "/admin/contact-inquiries",
    "/admin/seo",
    "/admin/blog-comments",
    "/admin/newsletter",
    "/admin/send-notifications",
    "/admin/account",
    "/api/admin/dashboard",
    "/api/admin/account",
    "/api/admin/notifications",
    "/api/admin/client-notifications",
    "/api/admin/cms",
    "/api/admin/cms/translate-all",
    "/api/admin/mobile-branding/analytics",
    "/api/admin/promotions",
    "/api/admin/analytics/installs",
    "/api/admin/analytics/users",
    "/api/admin/crashes",
    "/api/admin/uploads",
    "/api/admin/testimonials",
    "/api/admin/inquiries",
    "/api/admin/blog-comments",
    "/api/admin/newsletter",
  ],
};

export const roleModules = [
  {
    key: "dashboard",
    label: "Dashboard",
    roles: ["super_admin", "admin", "sales", "dispatch", "accounts", "content"],
  },
  {
    key: "clients",
    label: "Client Management",
    roles: ["super_admin", "admin", "sales"],
  },
  {
    key: "products",
    label: "Products",
    roles: ["super_admin", "admin", "content"],
  },
  {
    key: "inventory",
    label: "Inventory",
    roles: ["super_admin", "admin", "dispatch"],
  },
  {
    key: "orders",
    label: "Orders",
    roles: ["super_admin", "admin", "sales", "dispatch"],
  },
  {
    key: "dispatch",
    label: "Dispatch",
    roles: ["super_admin", "admin", "dispatch"],
  },
  {
    key: "payments",
    label: "Payments & Credit",
    roles: ["super_admin", "admin", "accounts"],
  },
  {
    key: "pricing",
    label: "Client Pricing",
    roles: ["super_admin", "admin", "sales"],
  },
  {
    key: "cms",
    label: "CMS / Pages / Blogs",
    roles: ["super_admin", "admin", "content"],
  },
  { key: "seo", label: "SEO", roles: ["super_admin", "admin", "content"] },
  {
    key: "reports",
    label: "Reports / Exports",
    roles: ["super_admin", "admin", "sales", "dispatch", "accounts"],
  },
  {
    key: "commerce",
    label: "Commerce control tower",
    roles: ["super_admin", "admin"],
  },
  { key: "audit", label: "Audit Logs", roles: ["super_admin", "admin"] },
  { key: "backup", label: "DB Backup / Restore", roles: ["super_admin"] },
  { key: "roles", label: "Roles & Permissions", roles: ["super_admin"] },
] as const satisfies Array<{ key: string; label: string; roles: AdminRole[] }>;

/** Prefix match for admin routes — see admin-token for full docs. */
export function roleCanAccess(role: AdminRole, pathname: string) {
  const prefixes = roleAccess[role];
  if (!prefixes?.length) return false;

  return prefixes.some((prefix) => {
    if (pathname === prefix) return true;
    if (prefix === "/admin" && role !== "super_admin" && role !== "admin") {
      return false;
    }
    if (prefix === "/api/admin" && role !== "super_admin" && role !== "admin") {
      return false;
    }
    return pathname.startsWith(`${prefix}/`);
  });
}

export function roleLabel(role: AdminRole) {
  return role
    .replace("_", " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}
