import { configuredAdmins } from "@/lib/admin-config";
import {
  roleAccess,
  roleCanAccess,
  roleLabel,
  roleModules,
  type AdminRole,
  type AdminSession,
  type ConfiguredAdmin,
} from "@/lib/admin-rbac";

export type {
  AdminRole,
  AdminSession,
  ConfiguredAdmin,
} from "@/lib/admin-rbac";
export {
  roleAccess,
  roleCanAccess,
  roleLabel,
  roleModules,
} from "@/lib/admin-rbac";
export { configuredAdmins } from "@/lib/admin-config";
export { verifyAdminTokenForMiddleware } from "@/lib/admin-token-edge";

import { requireEnvSecret } from "@/lib/require-env-secret";

function secret() {
  return requireEnvSecret("ADMIN_SESSION_SECRET");
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
  const { getAdminSessionVersion } = await import("@/lib/session-version");
  const now = Date.now();
  const sv = session.sv ?? (await getAdminSessionVersion(session.email));
  const payload: AdminSession = {
    ...session,
    sv,
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
    const { mergedConfiguredAdmins } =
      await import("@/lib/admin-profile-override");
    const admins = await mergedConfiguredAdmins(configuredAdmins());
    const admin = admins.find(
      (item) => item.email.toLowerCase() === payload.email.toLowerCase(),
    );
    if (!admin || admin.role !== payload.role) return null;
    const { getAdminSessionVersion } = await import("@/lib/session-version");
    const expectedSv = await getAdminSessionVersion(payload.email);
    if ((payload.sv ?? 0) !== expectedSv) return null;
    return payload;
  } catch {
    return null;
  }
}
