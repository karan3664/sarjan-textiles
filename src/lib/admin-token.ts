export type AdminRole = "super_admin" | "admin" | "sales" | "dispatch" | "accounts" | "content";

export type AdminSession = {
  email: string;
  name: string;
  role: AdminRole;
  exp: number;
};

const roleAccess: Record<AdminRole, string[]> = {
  super_admin: ["/admin", "/api/admin"],
  admin: ["/admin", "/api/admin"],
  sales: ["/admin/customers", "/admin/orders", "/admin/pricing", "/api/admin/customers", "/api/admin/orders", "/api/admin/pricing"],
  dispatch: ["/admin/dispatch", "/admin/orders", "/api/admin/orders"],
  accounts: ["/admin/payments", "/api/admin/orders"],
  content: [
    "/admin/home",
    "/admin/about",
    "/admin/blogs",
    "/admin/blogs-list",
    "/admin/blogs-create",
    "/admin/testimonials",
    "/admin/contact-inquiries",
    "/api/admin/cms",
    "/api/admin/uploads",
    "/api/admin/testimonials",
    "/api/admin/inquiries",
  ],
};

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "sarjan-demo-admin-secret-change-before-production";
}

function base64UrlEncode(value: string) {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  const bytes = Array.from(new Uint8Array(signature));
  return base64UrlEncode(String.fromCharCode(...bytes));
}

export async function createAdminToken(session: Omit<AdminSession, "exp">) {
  const payload: AdminSession = { ...session, exp: Date.now() + 1000 * 60 * 60 * 8 };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${await hmac(encoded)}`;
}

export async function verifyAdminToken(token?: string): Promise<AdminSession | null> {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || signature !== await hmac(encoded)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as AdminSession;
    if (!payload.email || !payload.role || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function roleCanAccess(role: AdminRole, pathname: string) {
  return roleAccess[role]?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ?? false;
}

export function roleLabel(role: AdminRole) {
  return role.replace("_", " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

export function configuredAdmins() {
  const configured = process.env.ADMIN_USERS_JSON;
  if (configured) {
    try {
      return JSON.parse(configured) as Array<{ email: string; password: string; name: string; role: AdminRole }>;
    } catch {
      return [];
    }
  }

  return [
    {
      email: process.env.ADMIN_EMAIL || "admin@sarjantextiles.com",
      password: process.env.ADMIN_PASSWORD || "admin123",
      name: "Super Admin",
      role: "super_admin" as const,
    },
  ];
}
