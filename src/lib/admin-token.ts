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
  super_admin: ["/admin", "/api/admin"],
  admin: ["/admin", "/api/admin"],
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
    "/admin/header-menu",
    "/admin/category-pages",
    "/admin/custom-pages",
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
    "/admin/account",
    "/api/admin/dashboard",
    "/api/admin/account",
    "/api/admin/notifications",
    "/api/admin/cms",
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

function secret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    "sarjan-demo-admin-secret-change-before-production"
  );
}

function base64UrlEncode(value: string) {
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1)
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  const bytes = Array.from(new Uint8Array(signature));
  return base64UrlEncode(String.fromCharCode(...bytes));
}

export async function createAdminToken(session: Omit<AdminSession, "exp">) {
  const now = Date.now();
  const payload: AdminSession = {
    ...session,
    iat: session.iat ?? now,
    exp: now + 1000 * 60 * 60 * 8,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${await hmac(encoded)}`;
}

export async function verifyAdminToken(
  token?: string,
): Promise<AdminSession | null> {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (
    !encoded ||
    !signature ||
    !constantTimeEqual(signature, await hmac(encoded))
  )
    return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as AdminSession;
    if (
      !payload.email ||
      !payload.role ||
      !roleAccess[payload.role] ||
      Date.now() > payload.exp
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns true when `pathname` is allowed for `role`.
 * For non–super roles, the prefix `/admin` only matches the dashboard (`/admin`),
 * not every child route — otherwise `/admin` would incorrectly allow all admin pages.
 */
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

export function configuredAdmins(): ConfiguredAdmin[] {
  const raw = process.env.ADMIN_USERS_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ConfiguredAdmin[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fall through to single admin from env */
    }
  }

  const email = process.env.ADMIN_EMAIL?.trim() || "admin@sarjantextiles.com";
  const rawPass = process.env.ADMIN_PASSWORD;
  const password =
    rawPass === undefined ? "admin123" : rawPass.trim() || "admin123";
  const rawHash = process.env.ADMIN_PASSWORD_HASH?.trim();

  return [
    {
      email,
      password,
      passwordHash: rawHash,
      name: "Super Admin",
      role: "super_admin" as const,
    },
  ];
}
